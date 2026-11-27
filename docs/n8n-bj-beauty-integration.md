# n8n WhatsApp integration — BJ Beauty

This document records the API contract used by the BJ Beauty WhatsApp agent and the required n8n configuration. It is based on the Express routes in `server.js`.

## API routes used by the agent

All routes below are protected by `n8nApiGuard` and require the `X-API-Key` request header.

| Purpose | Method | Route |
|---|---|---|
| Health check | GET | `/api/integrations/n8n/health` |
| Service catalogue | GET | `/api/integrations/n8n/catalog` |
| Availability | GET | `/api/integrations/n8n/availability?date=YYYY-MM-DD&serviceIds=id1,id2` |
| Create confirmed appointment | POST | `/api/integrations/n8n/appointments` |
| List appointments by WhatsApp phone | GET | `/api/integrations/n8n/appointments/by-phone/:phone` |
| Cancel appointment | POST | `/api/integrations/n8n/appointments/:id/cancel?phone=:phone` |

### Request contract

- **Availability**: `date` must be `YYYY-MM-DD`; `serviceIds` is a comma-separated list of active service IDs returned by the catalogue.
- **Create appointment**: JSON body contains `clientName`, `clientPhone`, `clientEmail` (optional), `serviceIds` (array), `date`, `time`, and optional `notes`.
- **List appointments**: the phone in the URL is normalized to digits; optional `status=Confirmada` filters the results.
- **Cancel appointment**: use the exact appointment `id` returned by the list endpoint and include the same client's phone in the `phone` query parameter. The API checks ownership before changing status.

The booking endpoint revalidates the selected slot server-side and returns HTTP 409 with `SLOT_UNAVAILABLE` if it has become unavailable. The agent must not claim a booking is confirmed unless the response contains `success: true` and an appointment with status `Confirmada`.

## Authentication — required n8n configuration

The server returns:
- `503` when `N8N_API_KEY` is not configured in the BJ Beauty server environment.
- `401` when the `X-API-Key` header is missing or does not match.

Create a **dedicated** n8n credential of type **HTTP Header Auth**:
- Header name: `X-API-Key`
- Header value: the exact value configured as `N8N_API_KEY` in the BJ Beauty server environment.

Attach that credential to each of these HTTP Request Tool nodes in the workflow:
- `Consultar catalogo BJ Beauty`
- `Consultar disponibilidad BJ Beauty`
- `Crear cita BJ Beauty`
- `Consultar mis citas BJ Beauty`
- `Cancelar cita BJ Beauty`

Do not reuse the Evolution API credential. It authenticates a different service. Never commit the key to Git, a workflow export, or this repository.

## WhatsApp inbound ordering

The inbound gate must run immediately after `Webhook Evolution`, before `Normalizar mensaje`. It accepts only `messages.upsert` events that are not sent by this account (`fromMe !== true`) and are not group or broadcast messages. Only after this gate may the workflow extract the sender number. A downstream content filter then accepts text, audio/image with media payload, and drops empty/unsupported messages.

A patch utility is provided at `scripts/patch-n8n-whatsapp-inbound-gate.mjs`. It takes an exported workflow JSON and writes a patched copy; it does not call n8n or deploy changes.

## Safe verification

1. Import the patched workflow into a non-production copy or a disabled workflow.
2. Test an inbound message from another number; it should reach the normalization node.
3. Test an outgoing message from the connected salon number (`fromMe: true)); it should stop at the inbound gate, before phone extraction.
4. Test a group and a broadcast event; both should be dropped.
5. With the dedicated header credential attached, call the health and catalogue tools. Confirm HTTP 200 and a valid JSON response.
6. Test availability using a real service ID and a future date. Do not create or cancel a live appointment as part of a smoke test.

The workflow patcher reports the BJ Beauty tool nodes that still lack explicit authentication configuration. Credentials are stored in n8n and are intentionally not included in this repository.
