#!/usr/bin/env node
/**
 * Applies the inbound-message gate to an n8n Evolution workflow export.
 *
 * Usage:
 *   node scripts/patch-n8n-whatsapp-inbound-gate.mjs input.json output.json
 *
 * The gate runs immediately after the webhook, before Normalizar mensaje
 * extracts or normalizes the sender phone number.
 */
import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/patch-n8n-whatsapp-inbound-gate.mjs input.json output.json');
  process.exit(2);
}

const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(workflow.nodes) || !workflow.connections) {
  throw new Error('Invalid n8n workflow export: nodes/connections missing');
}

const byName = (name) => workflow.nodes.find((node) => node.name === name);
const webhook = byName('Webhook Evolution');
const normalizer = byName('Normalizar mensaje');
const contentFilter = byName('Solo mensajes de texto entrantes');
if (!webhook || !normalizer || !contentFilter) {
  throw new Error('Expected nodes not found: Webhook Evolution, Normalizar mensaje, Solo mensajes de texto entrantes');
}

const gateName = 'Validar evento entrante (antes del número)';
const gateId = 'c4f0c6e1-3d31-4fd9-9b36-2f7c0c4e19a1';
let gate = byName(gateName);
if (!gate) {
  const [x, y] = webhook.position || [0, 0];
  gate = {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          {
            id: 'gate-event-upsert',
            leftValue: '={{ String($json.body?.event ?? "").toLowerCase().replace("_", ".") }}',
            rightValue: 'messages.upsert',
            operator: { type: 'string', operation: 'equals' }
          },
          {
            id: 'gate-not-from-me',
            leftValue: '={{ $json.body?.data?.key?.fromMe === true }}',
            rightValue: '',
            operator: { type: 'boolean', operation: 'false', singleValue: true }
          },
          {
            id: 'gate-not-group-or-broadcast',
            leftValue: '={{ !String($json.body?.data?.key?.remoteJid ?? "").endsWith("@g.us") && !String($json.body?.data?.key?.remoteJid ?? "").endsWith("@broadcast") }}',
            rightValue: '',
            operator: { type: 'boolean', operation: 'true', singleValue: true }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    id: gateId,
    name: gateName,
    type: 'n8n-nodes-base.filter',
    typeVersion: 2.3,
    position: [x + 192, y]
  };
  workflow.nodes.push(gate);
}

const assignments = normalizer.parameters?.assignments?.assignments;
if (!Array.isArray(assignments)) throw new Error('Normalizar mensaje has no Set assignments');

const validity = assignments.find((item) => item.name === 'valido' || item.id === 'f-valido');
if (validity) {
  validity.id = 'f-contenido-valido';
  validity.name = 'contenidoValido';
  validity.value = '={{ !!($json.body?.data?.message?.conversation ?? $json.body?.data?.message?.extendedTextMessage?.text ?? $json.body?.data?.message?.imageMessage?.caption) || ((!!$json.body?.data?.message?.audioMessage || !!$json.body?.data?.message?.imageMessage) && !!$json.body?.data?.message?.base64) }}';
} else if (!assignments.some((item) => item.name === 'contenidoValido')) {
  assignments.push({
    id: 'f-contenido-valido',
    name: 'contenidoValido',
    type: 'boolean',
    value: '={{ !!($json.body?.data?.message?.conversation ?? $json.body?.data?.message?.extendedTextMessage?.text ?? $json.body?.data?.message?.imageMessage?.caption) || ((!!$json.body?.data?.message?.audioMessage || !!$json.body?.data?.message?.imageMessage) && !!$json.body?.data?.message?.base64) }}'
  });
}

const oldContentCondition = contentFilter.parameters?.conditions?.conditions?.find((condition) => condition.leftValue?.includes('valido'));
if (!oldContentCondition) throw new Error('Could not locate the existing content filter condition');
oldContentCondition.leftValue = '={{ $json.contenidoValido }}';
contentFilter.name = 'Solo mensajes con contenido válido';

// Rewire webhook -> gate -> normalizer. The filter drops fromMe, group,
// broadcast and non-upsert events before the phone-number Set expressions run.
workflow.connections[webhook.name] = {
  main: [[{ node: gate.name, type: 'main', index: 0 }]]
};
workflow.connections[gate.name] = {
  main: [[{ node: normalizer.name, type: 'main', index: 0 }]]
};

// Keep the downstream content filter connection, updating its source key.
if (workflow.connections['Normalizar mensaje']) {
  workflow.connections['Normalizar mensaje'].main?.forEach((branch) => {
    for (const edge of branch) {
      if (edge.node === 'Solo mensajes de texto entrantes') edge.node = contentFilter.name;
    }
  });
}

const names = new Set(workflow.nodes.map((node) => node.name));
const ids = workflow.nodes.map((node) => node.id);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate node IDs detected');
for (const [source, connection] of Object.entries(workflow.connections)) {
  if (!names.has(source)) throw new Error(`Connection source not found: ${source}`);
  for (const branch of connection.main || []) {
    for (const edge of branch) {
      if (!names.has(edge.node)) throw new Error(`Connection target not found: ${source} -> ${edge.node}`);
    }
  }
}

const apiTools = workflow.nodes.filter((node) =>
  node.type === 'n8n-nodes-base.httpRequestTool' &&
  String(node.parameters?.url || '').includes('bettynails.es/api/integrations/n8n/')
);
const unauthenticated = apiTools.filter((node) => !node.credentials && !node.parameters?.authentication);
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2) + '\n');
console.log(`Patched workflow written to ${outputPath}`);
console.log(`Inbound gate: ${gate.name}; runs before phone normalization.`);
console.log(`BJ Beauty API tools found: ${apiTools.length}; missing explicit authentication config: ${unauthenticated.length}`);
if (unauthenticated.length) {
  console.warn('Configure a dedicated HTTP Header Auth credential (header X-API-Key) on:');
  for (const node of unauthenticated) console.warn(` - ${node.name}`);
}
