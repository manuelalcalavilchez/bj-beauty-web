import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import sqlite3 from 'sqlite3';

const apiKey = 'test-only-bj-beauty-n8n-key-0123456789abcdef';
const port = 41000 + Math.floor(Math.random() * 12000);
const baseUrl = `http://127.0.0.1:${port}`;
const madridToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
const bookingDate = new Date(Date.parse(madridToday + 'T12:00:00.000Z') + 86400000).toISOString().slice(0, 10);
const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const workingHours = JSON.stringify(days.map(day => ({ day, open: '09:00', close: '10:30', enabled: true })));

let tempDir;
let dbPath;
let db;
let server;
const serverOutput = [];

const dbRun = (database, sql, params = []) => new Promise((resolve, reject) => {
  database.run(sql, params, function (error) {
    if (error) reject(error);
    else resolve(this);
  });
});
const dbGet = (database, sql, params = []) => new Promise((resolve, reject) => {
  database.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
});
const dbClose = database => new Promise((resolve, reject) => database.close(error => error ? reject(error) : resolve()));

const api = (pathname, options = {}) => fetch(baseUrl + pathname, {
  ...options,
  headers: { 'X-API-Key': apiKey, ...(options.headers || {}) }
});

before(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'bj-beauty-n8n-'));
  dbPath = path.join(tempDir, 'bjbeauty-test.db');

  // Simula la tabla histórica con el nombre mojibake que existe en producción.
  const legacyName = 'sal' + String.fromCharCode(0x00c3, 0x00b3) + 'n_config';
  const setupDb = new sqlite3.Database(dbPath);
  await dbRun(setupDb, `CREATE TABLE "${legacyName}" (
    id TEXT PRIMARY KEY, calendarPublic INTEGER, workingHours TEXT, blockedSlots TEXT, vacations TEXT
  )`);
  await dbRun(setupDb,
    `INSERT INTO "${legacyName}" (id, calendarPublic, workingHours, blockedSlots, vacations)
     VALUES (?, ?, ?, ?, ?)`,
    ['main', 1, workingHours, JSON.stringify([`${bookingDate} 09:30-10:00`]), '[]']
  );
  await dbClose(setupDb);

  server = spawn(process.execPath, [path.join(process.cwd(), 'server.js')], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DB_PATH: dbPath,
      N8N_API_KEY: apiKey,
      SLOT_MINUTES: '0',
      N8N_MIN_LEAD_MINUTES: '0',
      SMTP_USER: '',
      SMTP_PASS: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => serverOutput.push(String(chunk)));
  server.stderr.on('data', chunk => serverOutput.push(String(chunk)));

  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(baseUrl + '/api/health');
      if (response.ok) { ready = true; break; }
    } catch { /* server is still starting */ }
    await delay(100);
  }
  if (!ready) throw new Error('BJ Beauty test server did not become ready. Output: ' + serverOutput.join('').slice(-5000));

  db = new sqlite3.Database(dbPath);
  const salonName = 'sal' + String.fromCharCode(0x00f3) + 'n_config';
  await dbRun(db, "UPDATE services SET duration = 30, price = 20 WHERE id = 'manicura'");
  await dbRun(db, "UPDATE services SET duration = 30, price = 25 WHERE id = 'pedicura'");
  await dbRun(db, `UPDATE "${salonName}" SET calendarPublic = 1, workingHours = ?, blockedSlots = ?, vacations = ? WHERE id = 'main'`,
    [workingHours, JSON.stringify([`${bookingDate} 09:30-10:00`]), '[]']);
  await dbRun(db,
    `INSERT INTO appointments
      (id, locator, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration,
       clientName, clientPhone, clientEmail, status, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['existing-test', 'BJB-0001', '["manicura"]', '[]', 'any', bookingDate, '12:00',
      20, 30, 'Cliente de prueba', '611296406', '', 'Confirmada', '',
      new Date().toISOString(), new Date().toISOString()]
  );
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(3000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  if (db) await dbClose(db);
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

test('migra el nombre antiguo de salón sin perder su configuración', async () => {
  const correctName = 'sal' + String.fromCharCode(0x00f3) + 'n_config';
  const tables = await new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type = 'table'", (error, rows) => error ? reject(error) : resolve(rows));
  });
  assert.ok(tables.some(row => row.name === correctName));
  assert.ok(!tables.some(row => row.name.includes(String.fromCharCode(0x00c3, 0x00b3))));
  const config = await dbGet(db, `SELECT calendarPublic, workingHours FROM "${correctName}" WHERE id = 'main'`);
  assert.equal(config.calendarPublic, 1);
  assert.equal(JSON.parse(config.workingHours).length, 7);
});

test('protege la API y devuelve el catálogo con la clave correcta', async () => {
  const missing = await fetch(baseUrl + '/api/integrations/n8n/health');
  assert.equal(missing.status, 401);
  const health = await api('/api/integrations/n8n/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'bj-beauty');
  const catalog = await api('/api/integrations/n8n/catalog');
  assert.equal(catalog.status, 200);
  const body = await catalog.json();
  assert.ok(body.services.some(service => service.id === 'manicura' && service.durationMinutes === 30 && service.price === 20));
});

test('exige teléfono y verifica la titularidad en consultas individuales', async () => {
  assert.equal((await api('/api/integrations/n8n/appointments/existing-test')).status, 400);
  assert.equal((await api('/api/integrations/n8n/appointments/existing-test?phone=699999999')).status, 404);
  assert.equal((await api('/api/integrations/n8n/appointments/existing-test?phone=611296406')).status, 200);
  assert.equal((await api('/api/integrations/n8n/appointments/by-locator/BJB-0001')).status, 400);
  assert.equal((await api('/api/integrations/n8n/appointments/by-locator/BJB-0001?phone=34611296406')).status, 200);
  const byPhone = await api('/api/integrations/n8n/appointments/by-phone/611296406?status=Confirmada');
  assert.equal(byPhone.status, 200);
  assert.equal((await byPhone.json()).count, 1);
  assert.equal((await api('/api/integrations/n8n/appointments/by-phone/123')).status, 400);
});

test('calcula disponibilidad con la cabina genérica y valida fechas y horas', async () => {
  const invalidDate = await api('/api/integrations/n8n/availability?date=2026-02-31&serviceIds=manicura');
  assert.equal(invalidDate.status, 400);
  const valid = await api(`/api/integrations/n8n/availability?date=${bookingDate}&serviceIds=manicura`);
  assert.equal(valid.status, 200);
  const result = await valid.json();
  assert.deepEqual(result.slots.map(slot => slot.time), ['09:00', '10:00']);
  assert.deepEqual(result.slots[0].specialistIds, ['any']);
});

test('crea reservas de forma idempotente y no permite solapamientos', async () => {
  const payload = {
    clientName: 'Cliente de prueba',
    clientPhone: '611296406',
    serviceIds: ['manicura'],
    date: bookingDate,
    time: '09:00',
    notes: 'Prueba automatizada'
  };
  const invalidTime = await api('/api/integrations/n8n/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, time: '25:00' })
  });
  assert.equal(invalidTime.status, 400);

  const created = await api('/api/integrations/n8n/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.appointment.specialistId, 'any');
  assert.equal(createdBody.appointment.totalDuration, 30);
  assert.equal(createdBody.appointment.totalPrice, 20);

  const repeated = await api('/api/integrations/n8n/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).alreadyExists, true);

  const differentServiceSameTime = await api('/api/integrations/n8n/appointments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, serviceIds: ['pedicura'] })
  });
  assert.equal(differentServiceSameTime.status, 409);
});

test('exige teléfono al cancelar y no permite reactivar una cita cancelada', async () => {
  const missingPhone = await api('/api/integrations/n8n/appointments/existing-test/cancel', { method: 'POST' });
  assert.equal(missingPhone.status, 400);
  const wrongPhone = await api('/api/integrations/n8n/appointments/existing-test/cancel?phone=699999999', { method: 'POST' });
  assert.equal(wrongPhone.status, 404);
  const cancelled = await api('/api/integrations/n8n/appointments/existing-test/cancel?phone=611296406', { method: 'POST' });
  assert.equal(cancelled.status, 200);
  const reactivated = await api('/api/integrations/n8n/appointments/existing-test/confirm?phone=611296406', { method: 'POST' });
  assert.equal(reactivated.status, 409);
});
