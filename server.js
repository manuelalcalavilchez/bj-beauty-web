import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// In-memory store (mocked — data resets on restart; provision Cloud SQL for persistence)
const memTables = new Map();
const getTable = (name) => {
  if (!memTables.has(name)) memTables.set(name, []);
  return memTables.get(name);
};
console.log('[AI Studio] Base de datos en memoria inicializada (sqlite3 mock activo)');

// ==================== EMAIL (nodemailer) ====================
const TEMPLATES_DIR = path.join(__dirname, 'templates');

let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('S& SMTP configurado:', process.env.SMTP_HOST || 'smtp.gmail.com');
} else {
  console.warn('a?  SMTP no configurado en .env (SMTP_USER/SMTP_PASS). Los emails solo se mostrarn en consola.');
}

// Sustituye {{variable}} en la plantilla HTML por su valor
const renderTemplate = (templateName, vars = {}) => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  let html = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value === undefined || value === null ? '' : String(value));
  }
  return html;
};

// Enva un email; nunca lanza (se registra el error y se sigue)
const sendEmail = async ({ to, subject, templateName, vars }) => {
  if (!to) return { success: false, error: 'Sin destinatario' };
  try {
    const html = renderTemplate(templateName, vars);
    if (!transporter) {
      console.log(`x [DEV - sin SMTP] Para: ${to} | Asunto: ${subject}`);
      return { success: true, dev: true };
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"BJ Beauty" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`S& Email enviado a ${to}: ${subject}`);
    return { success: true };
  } catch (err) {
    console.error(`R Error enviando email a ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// In-memory SQL helpers (replaces sqlite3 native addon)
const splitTopLevel = (str) => {
  const parts = [];
  let cur = '';
  let depth = 0;
  let inQuote = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && str[i - 1] !== '\\') inQuote = !inQuote;
    else if (!inQuote && ch === '(') depth++;
    else if (!inQuote && ch === ')') depth--;
    else if (!inQuote && depth === 0 && ch === ',') {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
};

const resolveToken = (token, params, cursor) => {
  const t = token.trim();
  if (t === '?') return params[cursor.i++];
  if (/^NULL$/i.test(t)) return null;
  if (/^'.*'$/.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
};

const matchWhere = (row, whereClause, params, cursor) => {
  if (!whereClause) return true;
  const parts = whereClause.split(/\s+AND\s+/i);
  for (const cond of parts) {
    const c = cond.trim();
    let m;
    if ((m = /^UPPER\((\w+)\)\s*=\s*(.+)$/i.exec(c))) {
      const val = resolveToken(m[2], params, cursor);
      if (String(row[m[1]] ?? '').toUpperCase() !== String(val ?? '').toUpperCase()) return false;
    } else if ((m = /^(\w+)\s*!=\s*(.+)$/.exec(c))) {
      const val = resolveToken(m[2], params, cursor);
      if (row[m[1]] == val) return false;
    } else if ((m = /^(\w+)\s*=\s*(.+)$/.exec(c))) {
      const val = resolveToken(m[2], params, cursor);
      if (row[m[1]] != val) return false;
    } else if ((m = /^(\w+)\s+LIKE\s+(.+)$/i.exec(c))) {
      const val = String(resolveToken(m[2], params, cursor) ?? '');
      const rx = new RegExp('^' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
      if (!rx.test(String(row[m[1]] ?? ''))) return false;
    } else if ((m = /^(\w+)\s+IN\s*\((.+)\)$/i.exec(c))) {
      const items = splitTopLevel(m[2]).map(tok => resolveToken(tok, params, cursor));
      if (!items.includes(row[m[1]])) return false;
    }
  }
  return true;
};

const filterRows = (rows, whereClause, params, cursor) => {
  if (!whereClause) return [...rows];
  // Evaluate parameter positions once by binding whereClause tokens first
  const boundTokens = [];
  const tempCursor = { i: cursor.i };
  const parts = whereClause.split(/\s+AND\s+/i);
  for (const cond of parts) {
    const c = cond.trim();
    const qMatches = c.match(/\?/g) || [];
    for (let k = 0; k < qMatches.length; k++) {
      boundTokens.push(params[tempCursor.i++]);
    }
  }
  cursor.i = tempCursor.i;
  return rows.filter(row => matchWhere(row, whereClause, boundTokens, { i: 0 }));
};

const sortRows = (rows, orderClause) => {
  if (!orderClause) return rows;
  const specs = orderClause.split(',').map(s => {
    const [col, dir] = s.trim().split(/\s+/);
    return { col, desc: /^DESC$/i.test(dir || '') };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc } of specs) {
      const va = a[col] ?? '';
      const vb = b[col] ?? '';
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
    }
    return 0;
  });
};

const dbRun = async (sql, params = []) => {
  const s = sql.replace(/\s+/g, ' ').trim();
  const cursor = { i: 0 };

  let m;
  if ((m = /^CREATE TABLE IF NOT EXISTS\s+([^\s(]+)/i.exec(s))) {
    getTable(m[1]);
    return { changes: 0 };
  }
  if (/^CREATE INDEX IF NOT EXISTS/i.test(s) || /^ALTER TABLE/i.test(s)) {
    return { changes: 0 };
  }
  if ((m = /^INSERT(?:\s+OR\s+(IGNORE))?\s+INTO\s+([^\s(]+)\s*\(([^)]+)\)\s*VALUES\s*\((.+?)\)(?:\s+ON\s+CONFLICT\s*\(([^)]+)\)\s*DO\s+UPDATE\s+SET\s+(.+))?$/i.exec(s))) {
    const isIgnore = Boolean(m[1]);
    const table = getTable(m[2]);
    const cols = splitTopLevel(m[3]);
    const vals = splitTopLevel(m[4]).map(tok => resolveToken(tok, params, cursor));
    const row = {};
    cols.forEach((col, idx) => { row[col] = vals[idx]; });

    const conflictCol = m[5]?.trim();
    const updateSet = m[6]?.trim();

    if (conflictCol) {
      const existing = table.find(r => r[conflictCol] === row[conflictCol]);
      if (existing) {
        for (const assign of splitTopLevel(updateSet)) {
          const am = /^(\w+)\s*=\s*(.+)$/.exec(assign);
          if (!am) continue;
          const targetCol = am[1];
          const expr = am[2].trim();
          if (expr.startsWith('excluded.')) {
            existing[targetCol] = row[expr.slice('excluded.'.length)];
          } else {
            existing[targetCol] = resolveToken(expr, params, cursor);
          }
        }
        return { changes: 1 };
      }
    } else if (isIgnore) {
      const keyCol = row.id !== undefined ? 'id' : (row.key !== undefined ? 'key' : null);
      if (keyCol && table.some(r => r[keyCol] === row[keyCol])) {
        return { changes: 0 };
      }
    }
    table.push(row);
    return { changes: 1 };
  }
  if ((m = /^UPDATE\s+([^\s]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i.exec(s))) {
    const table = getTable(m[1]);
    const assignments = splitTopLevel(m[2]).map(assign => {
      const am = /^(\w+)\s*=\s*(.+)$/.exec(assign);
      return { col: am[1], val: resolveToken(am[2], params, cursor) };
    });
    const matched = filterRows(table, m[3], params, cursor);
    for (const row of matched) {
      for (const { col, val } of assignments) row[col] = val;
    }
    return { changes: matched.length };
  }
  if ((m = /^DELETE\s+FROM\s+([^\s]+)(?:\s+WHERE\s+(.+))?$/i.exec(s))) {
    const table = getTable(m[1]);
    const matched = filterRows(table, m[2], params, cursor);
    const keep = table.filter(r => !matched.includes(r));
    memTables.set(m[1], keep);
    return { changes: matched.length };
  }
  return { changes: 0 };
};

const dbAll = async (sql, params = []) => {
  const s = sql.replace(/\s+/g, ' ').trim();
  const cursor = { i: 0 };

  let m;
  if ((m = /^PRAGMA table_info\(([^)]+)\)/i.exec(s))) {
    return [];
  }
  if ((m = /^SELECT\s+COUNT\(\*\)\s+AS\s+(\w+)\s+FROM\s+([^\s]+)(?:\s+WHERE\s+(.+?))?$/i.exec(s))) {
    const table = getTable(m[2]);
    const matched = filterRows(table, m[3], params, cursor);
    return [{ [m[1]]: matched.length }];
  }
  if ((m = /^SELECT\s+MAX\((\w+)\)\s+as\s+(\w+)\s+FROM\s+([^\s]+)$/i.exec(s))) {
    const table = getTable(m[3]);
    const maxVal = table.reduce((acc, r) => Math.max(acc, Number(r[m[1]] || 0)), 0);
    return [{ [m[2]]: maxVal }];
  }
  if ((m = /^SELECT\s+(.+?)\s+FROM\s+([^\s]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+(.+?))?$/i.exec(s))) {
    const fieldsRaw = m[1].trim();
    const table = getTable(m[2]);
    const matched = filterRows(table, m[3], params, cursor);
    const sorted = sortRows(matched, m[4]);
    if (fieldsRaw === '*') return sorted.map(r => ({ ...r }));
    const fields = splitTopLevel(fieldsRaw);
    return sorted.map(r => {
      const out = {};
      for (const f of fields) out[f] = r[f];
      return out;
    });
  }
  return [];
};

const dbGet = async (sql, params = []) => {
  const rows = await dbAll(sql, params);
  return rows[0];
};

const ensureColumn = async () => {};

// ==================== SEGURIDAD STAFF ====================
// Autenticacion de la Cabina Staff validada en servidor. El PIN nunca viaja al bundle del frontend.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');

const STAFF_PIN = process.env.STAFF_PIN || '';
const STAFF_SESSION_SECRET = process.env.STAFF_SESSION_SECRET || process.env.STAFF_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const STAFF_SESSION_MS = (Number(process.env.STAFF_SESSION_HOURS) || 12) * 60 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

if (!STAFF_PIN) console.warn('[staff] STAFF_PIN no configurado: el acceso Staff queda deshabilitado.');
if (!process.env.STAFF_SESSION_SECRET) console.warn('[staff] STAFF_SESSION_SECRET no configurado: las sesiones se invalidan al reiniciar.');

const revokedStaffTokens = new Map(); // jti -> exp
const staffLoginAttempts = new Map(); // ip -> { count, firstAt, lockedUntil }

const hmac = (value) => crypto.createHmac('sha256', STAFF_SESSION_SECRET).update(String(value)).digest('base64url');
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

const createStaffToken = () => {
  const payload = Buffer.from(JSON.stringify({
    jti: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + STAFF_SESSION_MS
  })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
};

const verifyStaffToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, hmac(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!data?.jti || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (revokedStaffTokens.has(data.jti)) return null;
    return data;
  } catch {
    return null;
  }
};

const requireStaff = (req, res, next) => {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = verifyStaffToken(token);
  if (!session) return res.status(401).json({ error: 'No autorizado' });
  req.staffSession = session;
  next();
};

// Limpieza periodica de intentos y tokens revocados caducados
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of revokedStaffTokens) if (exp < now) revokedStaffTokens.delete(jti);
  for (const [ip, a] of staffLoginAttempts) {
    if ((a.lockedUntil || 0) < now && now - a.firstAt > LOGIN_WINDOW_MS) staffLoginAttempts.delete(ip);
  }
}, 10 * 60 * 1000).unref();

app.post('/api/staff/login', async (req, res) => {
  if (!STAFF_PIN) return res.status(503).json({ error: 'Acceso Staff no configurado en el servidor' });
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let attempt = staffLoginAttempts.get(ip);
  if (!attempt || now - attempt.firstAt > LOGIN_WINDOW_MS) {
    attempt = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  if (attempt.lockedUntil > now) {
    const retryAfter = Math.ceil((attempt.lockedUntil - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Demasiados intentos. Prueba más tarde.', retryAfter });
  }

  const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
  if (pin && safeEqual(hmac(`pin:${pin}`), hmac(`pin:${STAFF_PIN}`))) {
    staffLoginAttempts.delete(ip);
    return res.json({ success: true, token: createStaffToken(), expiresIn: STAFF_SESSION_MS });
  }

  attempt.count += 1;
  if (attempt.count >= LOGIN_MAX_ATTEMPTS) attempt.lockedUntil = now + LOGIN_WINDOW_MS;
  staffLoginAttempts.set(ip, attempt);
  await new Promise(r => setTimeout(r, 400));
  return res.status(401).json({ error: 'PIN incorrecto', remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - attempt.count) });
});

app.get('/api/staff/session', requireStaff, (req, res) => {
  res.json({ authenticated: true, expiresAt: req.staffSession.exp });
});

app.post('/api/staff/logout', requireStaff, (req, res) => {
  revokedStaffTokens.set(req.staffSession.jti, req.staffSession.exp);
  res.json({ success: true });
});

// ==================== CONTENIDOS DE LA WEB ====================
// Textos editables desde Staff > Contenidos. Los valores por defecto reproducen la portada actual.
const SITE_CONTENT_DEFAULTS = {
  hero_kicker: 'BJ Beauty · Estética y Bienestar',
  hero_title: 'Tu belleza,',
  hero_title_highlight: 'nuestra pasión.',
  hero_subtitle: 'Diseño y laminado de cejas · Manicura · Pedicura. Cuida tus detalles, realza tu belleza.',
  hero_cta_booking: 'Solicitar cita',
  hero_cta_instagram: 'WhatsApp 611 296 406',
  services_kicker: 'Servicios',
  services_title: 'Cuida tus detalles',
  services_intro: 'Cejas, manos y pies con la calidad que mereces.',
  services_empty: 'No hay servicios activos publicados.',
  gallery_kicker: 'Galería',
  gallery_title: 'Resultados que enamoran',
  gallery_cta: 'Reservar',
  gallery_empty_title: 'La galería está pendiente de fotografías.',
  gallery_empty_text: 'Añade las imágenes reales desde Staff y aparecerán aquí.',
  closing_title: 'Realza tu belleza.',
  closing_subtitle: 'Calidad en cada servicio · Tu belleza, nuestra prioridad',
  closing_cta_booking: 'Solicitar cita',
  instagram_handle: 'WhatsApp 611 296 406',
  instagram_url: 'https://wa.me/34611296406'
};
const SITE_CONTENT_MAX_LENGTH = 1000;

const loadSiteContent = async () => {
  const rows = await dbAll('SELECT key, value, updatedAt FROM site_content');
  const content = { ...SITE_CONTENT_DEFAULTS };
  let updatedAt = null;
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(SITE_CONTENT_DEFAULTS, row.key) && typeof row.value === 'string') {
      content[row.key] = row.value;
      if (!updatedAt || row.updatedAt > updatedAt) updatedAt = row.updatedAt;
    }
  }
  return { content, defaults: SITE_CONTENT_DEFAULTS, updatedAt };
};

app.get('/api/content', async (req, res) => {
  try {
    res.json(await loadSiteContent());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/content', requireStaff, async (req, res) => {
  try {
    const incoming = req.body?.content;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ error: 'Formato no válido' });
    }
    const updates = [];
    for (const [key, raw] of Object.entries(incoming)) {
      if (!Object.prototype.hasOwnProperty.call(SITE_CONTENT_DEFAULTS, key)) continue;
      if (typeof raw !== 'string') return res.status(400).json({ error: `El campo ${key} debe ser texto` });
      const value = raw.trim();
      if (value.length > SITE_CONTENT_MAX_LENGTH) return res.status(400).json({ error: `El campo ${key} supera ${SITE_CONTENT_MAX_LENGTH} caracteres` });
      if (key === 'instagram_url' && value && !/^https:\/\/[^\s]+$/i.test(value)) {
        return res.status(400).json({ error: 'La URL de Instagram debe empezar por https://' });
      }
      updates.push([key, value]);
    }
    const now = new Date().toISOString();
    for (const [key, value] of updates) {
      // Vacio o igual al valor por defecto => se elimina y se usa el texto por defecto
      if (!value || value === SITE_CONTENT_DEFAULTS[key]) {
        await dbRun('DELETE FROM site_content WHERE key = ?', [key]);
      } else {
        await dbRun(
          'INSERT INTO site_content (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt',
          [key, value, now]
        );
      }
    }
    res.json({ success: true, ...(await loadSiteContent()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear tablas al iniciar
const initDatabase = async () => {
  try {
    // Tabla de citas
    await dbRun(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        locator TEXT UNIQUE,
        serviceIds TEXT,
        addonIds TEXT,
        specialistId TEXT,
        date TEXT,
        time TEXT,
        totalPrice REAL,
        totalDuration INTEGER,
        clientName TEXT,
        clientPhone TEXT,
        clientEmail TEXT,
        status TEXT,
        notes TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    await ensureColumn('appointments', 'lastActionSource', 'TEXT');
    await ensureColumn('appointments', 'lastActionAt', 'TEXT');

    // Tabla de diseños personalizados
    await dbRun(`
      CREATE TABLE IF NOT EXISTS custom_designs (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        clientName TEXT,
        clientPhone TEXT,
        clientEmail TEXT,
        shape TEXT,
        notes TEXT,
        imageBase64 TEXT,
        status TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    // Tabla de configuración del salón
    await dbRun(`
      CREATE TABLE IF NOT EXISTS salón_config (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        hours TEXT,
        logo TEXT,
        coverPhoto TEXT,
        primaryColor TEXT,
        accentColor TEXT,
        backgroundColor TEXT,
        whatsapp TEXT,
        calendarPublic INTEGER DEFAULT 1,
        workingHours TEXT,
        blockedSlots TEXT,
        vacations TEXT,
        nailShapes TEXT,
        nailLengths TEXT,
        nailStyles TEXT,
        products TEXT,
        updatedAt TEXT
      )
    `);

    // Migración segura para instalaciones existentes
    await ensureColumn('salón_config', 'whatsapp', 'TEXT');
    await ensureColumn('salón_config', 'calendarPublic', 'INTEGER DEFAULT 1');
    await ensureColumn('salón_config', 'workingHours', 'TEXT');
    await ensureColumn('salón_config', 'blockedSlots', 'TEXT');
    await ensureColumn('salón_config', 'vacations', 'TEXT');
    await ensureColumn('salón_config', 'nailShapes', 'TEXT');
    await ensureColumn('salón_config', 'nailLengths', 'TEXT');
    await ensureColumn('salón_config', 'nailStyles', 'TEXT');
    await ensureColumn('salón_config', 'products', 'TEXT');

    // Tabla de servicios
    await dbRun(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT,
        duration INTEGER,
        price REAL,
        description TEXT,
        active INTEGER
      )
    `);

    // Campos editoriales del catálogo público (migración segura)
    await ensureColumn('services', 'category', 'TEXT');
    await ensureColumn('services', 'shortDescription', 'TEXT');
    await ensureColumn('services', 'longDescription', 'TEXT');
    await ensureColumn('services', 'featured', 'INTEGER DEFAULT 0');
    await ensureColumn('services', 'sortOrder', 'INTEGER DEFAULT 0');
    await ensureColumn('services', 'instagramSource', 'TEXT');
    await ensureColumn('services', 'icon', 'TEXT');
    await ensureColumn('services', 'updatedAt', 'TEXT');

    // Tabla de especialistas
    await dbRun(`
      CREATE TABLE IF NOT EXISTS specialists (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        photo TEXT,
        description TEXT,
        active INTEGER
      )
    `);

    // Solicitudes de cancelación: la reserva solo cambia tras decisión del salón.
    await dbRun(`
      CREATE TABLE IF NOT EXISTS cancellation_requests (
        id TEXT PRIMARY KEY, appointmentId TEXT NOT NULL, locator TEXT NOT NULL,
        clientName TEXT, clientPhone TEXT, clientEmail TEXT, reason TEXT,
        status TEXT NOT NULL DEFAULT 'Pendiente', createdAt TEXT NOT NULL,
        decidedAt TEXT, decisionNotes TEXT
      )
    `);
    await dbRun('CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status, createdAt)');

    // CRM: fichas de clientes y facturas con datos históricos del emisor y receptor.
    await dbRun(`
      CREATE TABLE IF NOT EXISTS crm_customers (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, taxId TEXT,
        address TEXT, postalCode TEXT, city TEXT, notes TEXT,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      )
    `);
    await dbRun('CREATE INDEX IF NOT EXISTS idx_crm_customers_phone ON crm_customers(phone)');
    await dbRun('CREATE INDEX IF NOT EXISTS idx_crm_customers_email ON crm_customers(email)');
    await dbRun(`
      CREATE TABLE IF NOT EXISTS crm_invoices (
        id TEXT PRIMARY KEY, number TEXT UNIQUE NOT NULL, issueDate TEXT NOT NULL,
        customerId TEXT, appointmentId TEXT, status TEXT NOT NULL DEFAULT 'Borrador',
        issuerName TEXT NOT NULL, issuerTaxId TEXT NOT NULL, issuerAddress TEXT NOT NULL,
        issuerPostalCode TEXT, issuerCity TEXT, issuerEmail TEXT,
        customerName TEXT NOT NULL, customerTaxId TEXT, customerAddress TEXT,
        customerPostalCode TEXT, customerCity TEXT, customerEmail TEXT,
        description TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1,
        unitPrice REAL NOT NULL, taxRate REAL NOT NULL DEFAULT 21,
        subtotal REAL NOT NULL, taxAmount REAL NOT NULL, total REAL NOT NULL,
        paymentMethod TEXT, paidAt TEXT, notes TEXT,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      )
    `);
    await dbRun('CREATE INDEX IF NOT EXISTS idx_crm_invoices_date ON crm_invoices(issueDate DESC)');


    // Tabla de solicitudes de cita
    await dbRun(`
      CREATE TABLE IF NOT EXISTS booking_requests (
        id TEXT PRIMARY KEY,
        clientName TEXT,
        clientPhone TEXT,
        clientEmail TEXT,
        serviceType TEXT,
        preferredDate TEXT,
        preferredTime TEXT,
        notes TEXT,
        status TEXT,
        createdAt TEXT,
        respondedAt TEXT
      )
    `);

    // Tabla de galera
    await dbRun(`
      CREATE TABLE IF NOT EXISTS gallery (
        id TEXT PRIMARY KEY,
        photoBase64 TEXT,
        title TEXT,
        caption TEXT,
        uploadedAt TEXT,
        displayOrder INTEGER
      )
    `);

    // Tabla de contenidos editables de la web (Staff > Contenidos)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS site_content (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      )
    `);

    // Semilla inicial: una sola cabina/especialista y catálogo real del proyecto.
    const serviceCount = await dbGet('SELECT COUNT(*) AS c FROM services');
    if (Number(serviceCount?.c || 0) === 0) {
      const seedServices = [
        ['diseno-laminado-cejas', 'Diseño y laminado de cejas', 'cejas', 'brows', 'Diseño personalizado y laminado para unas cejas definidas y duraderas.', 1],
        ['manicura', 'Manicura', 'manicura', 'manicure', 'Manicura con acabados impecables: francesa, diseños y decoración.', 2],
        ['pedicura', 'Pedicura', 'pedicura', 'pedicure', 'Pies cuidados, suaves y con un esmaltado que enamora.', 3]
      ];
      for (const [id, name, category, icon, description, sortOrder] of seedServices) {
        await dbRun(
          'INSERT INTO services (id, name, duration, price, description, shortDescription, category, icon, featured, sortOrder, instagramSource, updatedAt, active) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 1, ?, ?, ?, 1)',
          [id, name, description, description, category, icon, sortOrder, '', new Date().toISOString()]
        );
      }
    }

    // Normaliza textos históricos que pudieron guardarse con codificación defectuosa.
    // Se ejecuta en cada arranque para corregir también instalaciones ya existentes.
    await dbRun('UPDATE specialists SET name = ?, description = ? WHERE id = ?', ['Cualquiera disponible', 'Asignación automática a la cabina disponible.', 'any']);

    const specialistCount = await dbGet('SELECT COUNT(*) AS c FROM specialists');
    if (Number(specialistCount?.c || 0) === 0) {
      await dbRun(
        'INSERT INTO specialists (id, name, role, photo, description, active) VALUES (?, ?, ?, ?, ?, 1)',
        ['any', 'Cualquiera disponible', 'Equipo BJ Beauty', '', 'Asignación automática a la cabina disponible.']
      );
    }

    const configCount = await dbGet('SELECT COUNT(*) AS c FROM salón_config');
    if (Number(configCount?.c || 0) === 0) {
      const defaultHours = [
        { day: 'Lunes', open: '09:00', close: '19:00', enabled: true },
        { day: 'Martes', open: '09:00', close: '19:00', enabled: true },
        { day: 'Miércoles', open: '09:00', close: '19:00', enabled: true },
        { day: 'Jueves', open: '09:00', close: '19:00', enabled: true },
        { day: 'Viernes', open: '09:00', close: '19:00', enabled: true },
        { day: 'Sábado', open: '09:00', close: '13:00', enabled: true },
        { day: 'Domingo', open: '10:00', close: '14:00', enabled: false }
      ];
      await dbRun(
        `INSERT INTO salón_config
         (id, name, description, phone, email, address, hours, logo, coverPhoto,
          primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
          workingHours, blockedSlots, vacations, nailShapes, nailLengths, nailStyles, products, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'main', 'BJ Beauty',
          'Estética y Bienestar · Diseño y laminado de cejas · Manicura · Pedicura · Tu belleza, nuestra pasión',
          '611296406', '', '',
          '',
          '', '', '#2B0F1E', '#E0407F', '#FDEEF3', '34611296406',
          0, JSON.stringify(defaultHours), JSON.stringify([]), JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]),
          JSON.stringify([]), new Date().toISOString()
        ]
      );
    }

    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error inicializando BD:', err);
  }
};

// ==================== RUTAS API ====================


/* ==================== CRM ==================== */
app.get('/api/crm/customers', requireStaff, async (req, res) => {
  try {
    const appointments = getTable('appointments');
    const customers = getTable('crm_customers');
    for (const appt of appointments) {
      const phone = String(appt.clientPhone || '').trim();
      const email = String(appt.clientEmail || '').trim();
      if (!phone && !email) continue;
      const existing = customers.find(c =>
        (phone && c.phone === phone) ||
        (email && String(c.email || '').toLowerCase() === email.toLowerCase())
      );
      if (!existing) {
        const id = 'legacy_' + crypto.createHash('sha256').update(phone || email).digest('hex').slice(0, 16);
        const now = new Date().toISOString();
        customers.push({
          id,
          name: appt.clientName || 'Cliente',
          phone,
          email,
          taxId: '',
          address: '',
          postalCode: '',
          city: '',
          notes: '',
          createdAt: appt.createdAt || now,
          updatedAt: now
        });
      }
    }
    const rows = customers.map(c => {
      const matched = appointments.filter(a =>
        (c.phone && c.phone === a.clientPhone) ||
        (c.email && String(c.email).toLowerCase() === String(a.clientEmail || '').toLowerCase())
      );
      const dates = matched.map(a => a.date).filter(Boolean).sort();
      const completedSpend = matched.reduce((sum, a) => sum + (a.status === 'Completada' ? Number(a.totalPrice || 0) : 0), 0);
      return {
        ...c,
        appointmentCount: matched.length,
        lastAppointment: dates.length ? dates[dates.length - 1] : null,
        completedSpend
      };
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/customers', requireStaff, async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
    const id = b.id || 'cli_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const values = [name, String(b.phone || '').trim().slice(0, 40), String(b.email || '').trim().slice(0, 150), String(b.taxId || '').trim().slice(0, 30), String(b.address || '').trim().slice(0, 200), String(b.postalCode || '').trim().slice(0, 12), String(b.city || '').trim().slice(0, 100), String(b.notes || '').trim().slice(0, 2000)];
    await dbRun(`INSERT INTO crm_customers (id,name,phone,email,taxId,address,postalCode,city,notes,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, phone=excluded.phone, email=excluded.email, taxId=excluded.taxId,
      address=excluded.address, postalCode=excluded.postalCode, city=excluded.city, notes=excluded.notes, updatedAt=excluded.updatedAt`,
      [id, ...values, now, now]);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/crm/invoices', requireStaff, async (req, res) => {
  try { res.json(await dbAll('SELECT * FROM crm_invoices ORDER BY issueDate DESC, createdAt DESC')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/invoices', requireStaff, async (req, res) => {
  try {
    const b = req.body || {};
    const required = ['issuerName','issuerTaxId','issuerAddress','customerName','description'];
    if (required.some(k => !String(b[k] || '').trim())) return res.status(400).json({ error: 'Completa los datos fiscales del emisor, el cliente y el concepto.' });
    const quantity = Number(b.quantity || 1), unitPrice = Number(b.unitPrice), taxRate = Number(b.taxRate);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10000 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return res.status(400).json({ error: 'Cantidad, precio o tipo impositivo no válidos.' });
    const subtotal = Math.round(quantity * unitPrice * 100) / 100;
    const taxAmount = Math.round(subtotal * taxRate) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const issueDate = String(b.issueDate || new Date().toISOString().slice(0,10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) return res.status(400).json({ error: 'Fecha de factura no válida.' });
    const year = issueDate.slice(0,4);
    const count = await dbGet('SELECT COUNT(*) AS n FROM crm_invoices WHERE number LIKE ?', [year + '-%']);
    const number = year + '-' + String((count?.n || 0) + 1).padStart(4, '0');
    const id = 'inv_' + crypto.randomBytes(10).toString('hex');
    const now = new Date().toISOString();
    const status = b.status === 'Emitida' ? 'Emitida' : 'Borrador';
    await dbRun(`INSERT INTO crm_invoices
      (id,number,issueDate,customerId,appointmentId,status,issuerName,issuerTaxId,issuerAddress,issuerPostalCode,issuerCity,issuerEmail,
       customerName,customerTaxId,customerAddress,customerPostalCode,customerCity,customerEmail,description,quantity,unitPrice,taxRate,subtotal,taxAmount,total,paymentMethod,paidAt,notes,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,number,issueDate,b.customerId || null,b.appointmentId || null,status,
       String(b.issuerName).trim(),String(b.issuerTaxId).trim(),String(b.issuerAddress).trim(),b.issuerPostalCode || '',b.issuerCity || '',b.issuerEmail || '',
       String(b.customerName).trim(),b.customerTaxId || '',b.customerAddress || '',b.customerPostalCode || '',b.customerCity || '',b.customerEmail || '',
       String(b.description).trim().slice(0,500),quantity,unitPrice,taxRate,subtotal,taxAmount,total,b.paymentMethod || '',null,String(b.notes || '').slice(0,1000),now,now]);
    res.status(201).json({ success: true, id, number, subtotal, taxAmount, total, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/crm/invoices/:id/status', requireStaff, async (req, res) => {
  try {
    const status = String(req.body.status || '');
    if (!['Borrador','Emitida','Cobrada','Anulada'].includes(status)) return res.status(400).json({ error: 'Estado de factura no válido.' });
    const invoice = await dbGet('SELECT * FROM crm_invoices WHERE id = ?', [req.params.id]);
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada.' });
    if (invoice.status === 'Anulada') return res.status(409).json({ error: 'Una factura anulada no se puede reactivar.' });
    const now = new Date().toISOString();
    await dbRun('UPDATE crm_invoices SET status = ?, paidAt = ?, updatedAt = ? WHERE id = ?', [status, status === 'Cobrada' ? now : invoice.paidAt, now, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CITAS
app.get('/api/appointments', requireStaff, async (req, res) => {
  try {
    const appointments = await dbAll('SELECT * FROM appointments ORDER BY date DESC, time DESC');
    res.json(appointments.map(a => ({
      ...a,
      serviceIds: JSON.parse(a.serviceIds || '[]'),
      addonIds: JSON.parse(a.addonIds || '[]')
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/appointments', requireStaff, async (req, res) => {
  try {
    const { id, locator, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, notes } = req.body;
    
    await dbRun(
      `INSERT INTO appointments 
       (id, locator, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, status, notes, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, locator, JSON.stringify(serviceIds), JSON.stringify(addonIds), specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, 'Confirmada', notes || '', new Date().toISOString(), new Date().toISOString()]
    );

    sendEmail({
      to: clientEmail,
      subject: `Tu cita est confirmada  PIN ${locator}  BJ Beauty`,
      templateName: 'booking-confirmed.html',
      vars: { clientName, locator, date, time, totalPrice: totalPrice ?? 0 }
    });

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', requireStaff, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    await dbRun(
      'UPDATE appointments SET status = ?, notes = ?, updatedAt = ? WHERE id = ?',
      [status, notes || '', new Date().toISOString(), req.params.id]
    );

    if (status === 'Cancelada') {
      const appt = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
      if (appt?.clientEmail) {
        sendEmail({
          to: appt.clientEmail,
          subject: `Tu cita ${appt.locator} ha sido cancelada  BJ Beauty`,
          templateName: 'booking-cancelled.html',
          vars: { clientName: appt.clientName, locator: appt.locator, date: appt.date, time: appt.time }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DISEOS
// ==================== INTEGRACION N8N / WHATSAPP ====================
// Rutas limitadas para que n8n consulte y ejecute acciones de negocio.

const customerPortalAttempts = new Map();
const customerPortalRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = customerPortalAttempts.get(key);
  if (!current || now - current.startedAt > 15 * 60 * 1000) {
    customerPortalAttempts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (current.count >= 12) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' });
  current.count += 1;
  next();
};
const normalizeCustomerPhone = value => String(value || '').replace(/\D/g, '');
app.get('/api/customer/appointments', customerPortalRateLimit, async (req, res) => {
  try {
    const locator = String(req.query.locator || '').trim().toUpperCase();
    const phone = normalizeCustomerPhone(req.query.phone);
    if (!locator || phone.length < 9) return res.status(400).json({ error: 'Introduce el localizador y el teléfono completo.' });
    const appointment = await dbGet('SELECT * FROM appointments WHERE UPPER(locator) = ?', [locator]);
    if (!appointment || normalizeCustomerPhone(appointment.clientPhone) !== phone) return res.status(404).json({ error: 'No encontramos una cita con esos datos.' });
    const requests = await dbAll('SELECT id, status, reason, createdAt, decidedAt, decisionNotes FROM cancellation_requests WHERE appointmentId = ? ORDER BY createdAt DESC', [appointment.id]);
    res.json([{ ...appointment, serviceIds: JSON.parse(appointment.serviceIds || '[]'), addonIds: JSON.parse(appointment.addonIds || '[]'), cancellationRequests: requests }]);
  } catch (err) { res.status(500).json({ error: 'No se pudieron consultar las citas.' }); }
});

app.post('/api/customer/appointments/:id/cancellation-requests', customerPortalRateLimit, async (req, res) => {
  try {
    const locator = String(req.body.locator || '').trim().toUpperCase();
    const phone = normalizeCustomerPhone(req.body.phone);
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!locator || phone.length < 9) return res.status(400).json({ error: 'Datos de verificación incompletos.' });
    const appointment = await dbGet('SELECT * FROM appointments WHERE id = ? AND UPPER(locator) = ?', [req.params.id, locator]);
    if (!appointment || normalizeCustomerPhone(appointment.clientPhone) !== phone) return res.status(404).json({ error: 'No encontramos esa cita.' });
    if (appointment.status !== 'Confirmada') return res.status(409).json({ error: 'Solo se pueden solicitar cancelaciones de citas confirmadas.' });
    const pending = await dbGet("SELECT id FROM cancellation_requests WHERE appointmentId = ? AND status = 'Pendiente'", [appointment.id]);
    if (pending) return res.status(409).json({ error: 'Ya existe una solicitud pendiente para esta cita.' });
    const id = 'cancel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    await dbRun('INSERT INTO cancellation_requests (id, appointmentId, locator, clientName, clientPhone, clientEmail, reason, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, appointment.id, appointment.locator, appointment.clientName, appointment.clientPhone, appointment.clientEmail || '', reason, 'Pendiente', new Date().toISOString()]);
    res.json({ success: true, id, status: 'Pendiente' });
  } catch (err) { res.status(500).json({ error: 'No se pudo registrar la solicitud.' }); }
});

app.get('/api/cancellation-requests', requireStaff, async (req, res) => {
  try {
    const requests = getTable('cancellation_requests');
    const appointments = getTable('appointments');
    const rows = requests.map(cr => {
      const a = appointments.find(ap => ap.id === cr.appointmentId);
      return {
        ...cr,
        date: a?.date ?? null,
        time: a?.time ?? null,
        appointmentStatus: a?.status ?? null
      };
    }).sort((a, b) => {
      const pa = a.status === 'Pendiente' ? 0 : 1;
      const pb = b.status === 'Pendiente' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/cancellation-requests/:id/decision', requireStaff, async (req, res) => {
  try {
    const decision = String(req.body.decision || '');
    const decisionNotes = String(req.body.decisionNotes || '').trim().slice(0, 500);
    if (!['Aceptada', 'Rechazada'].includes(decision)) return res.status(400).json({ error: 'Decisión no válida.' });
    const request = await dbGet('SELECT * FROM cancellation_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    if (request.status !== 'Pendiente') return res.status(409).json({ error: 'Esta solicitud ya ha sido resuelta.' });
    const appointment = await dbGet('SELECT * FROM appointments WHERE id = ?', [request.appointmentId]);
    if (!appointment) return res.status(404).json({ error: 'La cita asociada ya no existe.' });
    if (decision === 'Aceptada' && appointment.status !== 'Confirmada') return res.status(409).json({ error: 'La cita ya no está confirmada.' });
    const now = new Date().toISOString();
    await dbRun('UPDATE cancellation_requests SET status = ?, decidedAt = ?, decisionNotes = ? WHERE id = ?', [decision, now, decisionNotes, request.id]);
    if (decision === 'Aceptada') await dbRun("UPDATE appointments SET status = 'Cancelada', updatedAt = ?, lastActionSource = 'staff-cancellation-request', lastActionAt = ? WHERE id = ?", [now, now, appointment.id]);
    if (appointment.clientEmail) sendEmail({ to: appointment.clientEmail, subject: decision === 'Aceptada' ? 'Cancelación aceptada · cita ' + appointment.locator : 'Solicitud de cancelación rechazada · cita ' + appointment.locator, templateName: decision === 'Aceptada' ? 'booking-cancelled.html' : 'booking-confirmed.html', vars: { clientName: appointment.clientName, locator: appointment.locator, date: appointment.date, time: appointment.time, decisionNotes } });
    res.json({ success: true, decision, appointmentStatus: decision === 'Aceptada' ? 'Cancelada' : appointment.status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const n8nApiGuard = (req, res, next) => {
  const expected = process.env.N8N_API_KEY;
  if (!expected) return res.status(503).json({ error: 'N8N_API_KEY no configurada en el servidor' });
  if (req.get('X-API-Key') !== expected) return res.status(401).json({ error: 'API key de n8n no valida' });
  next();
};
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const serializeAppointment = (a) => ({ ...a, serviceIds: JSON.parse(a.serviceIds || '[]'), addonIds: JSON.parse(a.addonIds || '[]') });

// Propiedad: si n8n envia phone (query o body), debe coincidir con el telefono de la cita.
const n8nOwns = (appointment, req) => {
  const phone = normalizePhone((req.query && req.query.phone) || (req.body && req.body.phone));
  if (!phone) return true;
  return normalizePhone(appointment.clientPhone) === phone;
};
const madridNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = (t) => parts.find(p => p.type === t).value;
  return { date: g('year') + '-' + g('month') + '-' + g('day'), minutes: Number(g('hour')) * 60 + Number(g('minute')) };
};
const toMinutes = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const toHHMM = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const isPastAppointment = (a) => { const now = madridNow(); const start = toMinutes(a.time); if (a.date < now.date) return true; if (a.date > now.date) return false; return start !== null && start <= now.minutes; };


app.get('/api/integrations/n8n/health', n8nApiGuard, (req, res) => {
  res.json({ success: true, service: 'bj-beauty', version: 1, verifactu: 'not-active' });
});

app.get('/api/integrations/n8n/appointments/:id', n8nApiGuard, async (req, res) => {
  try { const appointment = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]); if (!appointment || !n8nOwns(appointment, req)) return res.status(404).json({ error: 'Cita no encontrada' }); res.json({ success: true, appointment: serializeAppointment(appointment) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/integrations/n8n/appointments/by-locator/:locator', n8nApiGuard, async (req, res) => {
  try { const appointment = await dbGet('SELECT * FROM appointments WHERE locator = ?', [req.params.locator]); if (!appointment || !n8nOwns(appointment, req)) return res.status(404).json({ error: 'Cita no encontrada' }); res.json({ success: true, appointment: serializeAppointment(appointment) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/integrations/n8n/appointments/by-phone/:phone', n8nApiGuard, async (req, res) => {
  try { const phone = normalizePhone(req.params.phone); const status = req.query.status ? String(req.query.status) : null; const rows = await dbAll('SELECT * FROM appointments ORDER BY date ASC, time ASC'); const matches = rows.filter(a => normalizePhone(a.clientPhone) === phone && (!status || a.status === status)); res.json({ success: true, count: matches.length, appointments: matches.map(serializeAppointment) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

const n8nSetStatus = async (req, res, targetStatus) => {
  try {
    const current = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!current || !n8nOwns(current, req)) return res.status(404).json({ error: 'Cita no encontrada' });
    if (targetStatus === 'Completada' && !isPastAppointment(current)) return res.status(409).json({ error: 'No se puede completar una cita futura' });
    if (targetStatus === 'Confirmada' && current.status === 'Completada') return res.status(409).json({ error: 'Una cita completada no puede volver a Confirmada' });
    if (targetStatus === 'Cancelada' && current.status === 'Completada') return res.status(409).json({ error: 'Una cita completada no puede cancelarse mediante esta accion' });
    if (targetStatus === 'Completada' && current.status === 'Cancelada') return res.status(409).json({ error: 'Una cita cancelada no puede completarse' });
    if (current.status === targetStatus) return res.json({ success: true, action: targetStatus, alreadySet: true, appointment: serializeAppointment(current) });
    const now = new Date().toISOString();
    await dbRun('UPDATE appointments SET status = ?, lastActionSource = ?, lastActionAt = ?, updatedAt = ? WHERE id = ?', [targetStatus, 'n8n', now, now, req.params.id]);
    const updated = await dbGet('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (targetStatus === 'Cancelada' && updated?.clientEmail) sendEmail({ to: updated.clientEmail, subject: 'Tu cita ' + updated.locator + ' ha sido cancelada - BJ Beauty', templateName: 'booking-cancelled.html', vars: { clientName: updated.clientName, locator: updated.locator, date: updated.date, time: updated.time } });
    res.json({ success: true, action: targetStatus, appointment: serializeAppointment(updated) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

app.post('/api/integrations/n8n/appointments/:id/confirm', n8nApiGuard, (req, res) => n8nSetStatus(req, res, 'Confirmada'));
app.post('/api/integrations/n8n/appointments/:id/cancel', n8nApiGuard, (req, res) => n8nSetStatus(req, res, 'Cancelada'));
app.post('/api/integrations/n8n/appointments/:id/complete', n8nApiGuard, (req, res) => n8nSetStatus(req, res, 'Completada'));

// ---- Catalogo, disponibilidad y reserva para el agente de WhatsApp ----
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES || 30);
const MIN_LEAD_MINUTES = Number(process.env.N8N_MIN_LEAD_MINUTES || 60);
const MAX_DAYS_AHEAD = Number(process.env.N8N_MAX_DAYS_AHEAD || 90);
const MAX_ACTIVE_PER_PHONE = Number(process.env.N8N_MAX_ACTIVE_APPOINTMENTS_PER_PHONE || 3);
const DAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const stripAccents = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const parseJson = (v, fallback) => { try { const x = typeof v === 'string' ? JSON.parse(v) : v; return x ?? fallback; } catch { return fallback; } };
const isDateStr = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(Date.parse(v + 'T12:00:00Z'));

const loadServices = async (ids) => {
  const unique = [...new Set((ids || []).map(String))];
  if (!unique.length) return { error: 'Falta al menos un servicio' };
  const rows = await dbAll('SELECT * FROM services WHERE active = 1');
  const found = unique.map(id => rows.find(r => r.id === id));
  if (found.some(x => !x)) return { error: 'Algun servicio no existe o no esta activo' };
  const missingConfig = found.filter(x => !(Number(x.duration) > 0) || !(Number(x.price) > 0));
  if (missingConfig.length) return { error: 'Configura precio y duracion para estos servicios antes de aceptar reservas: ' + missingConfig.map(x => x.name).join(', ') };
  return { services: found, totalDuration: found.reduce((n, x) => n + Number(x.duration), 0), totalPrice: found.reduce((n, x) => n + Number(x.price), 0) };
};

const computeSlots = async ({ date, duration, specialistId }) => {
  const cfg = await dbGet("SELECT workingHours, blockedSlots, vacations, calendarPublic FROM salón_config WHERE id = 'main'");
  const working = parseJson(cfg && cfg.workingHours, []);
  const blocked = parseJson(cfg && cfg.blockedSlots, []);
  const vacations = parseJson(cfg && cfg.vacations, []);
  if (!cfg || Number(cfg.calendarPublic) !== 1) return [];
  if (vacations.includes(date)) return [];
  const dayKey = DAY_KEYS[new Date(date + 'T12:00:00Z').getUTCDay()];
  const hours = working.find(h => stripAccents(h.day) === dayKey && h.enabled !== false);
  if (!hours) return [];
  const open = toMinutes(hours.open); const close = toMinutes(hours.close);
  if (open === null || close === null) return [];
  const blockedIntervals = [];
  for (const b of blocked) {
    const txt = String(b).trim();
    if (txt === date) return [];
    const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(txt);
    if (m && m[1] === date) blockedIntervals.push([toMinutes(m[2]), toMinutes(m[3])]);
  }
  let specialists = (await dbAll('SELECT id, name FROM specialists WHERE active = 1')).filter(s => s.id !== 'any');
  if (specialistId) specialists = specialists.filter(s => s.id === specialistId);
  if (!specialists.length) return [];
  const booked = (await dbAll("SELECT specialistId, time, totalDuration FROM appointments WHERE date = ? AND status != 'Cancelada'", [date]))
    .map(a => ({ specialistId: a.specialistId, start: toMinutes(a.time), end: toMinutes(a.time) + (Number(a.totalDuration) || SLOT_MINUTES) }))
    .filter(a => a.start !== null);
  const now = madridNow();
  const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;
  const slots = [];
  for (let t = open; t + duration <= close; t += SLOT_MINUTES) {
    if (date === now.date && t < now.minutes + MIN_LEAD_MINUTES) continue;
    if (blockedIntervals.some(([bs, be]) => overlaps(t, t + duration, bs, be))) continue;
    const clash = booked.filter(a => overlaps(t, t + duration, a.start, a.end));
    const taken = new Set(clash.filter(a => specialists.some(sp => sp.id === a.specialistId)).map(a => a.specialistId));
    const unassigned = specialistId ? 0 : clash.filter(a => !specialists.some(sp => sp.id === a.specialistId)).length;
    const free = specialists.filter(sp => !taken.has(sp.id));
    if (free.length - unassigned > 0) slots.push({ time: toHHMM(t), specialistIds: free.map(f => f.id) });
  }
  return slots;
};

app.get('/api/integrations/n8n/catalog', n8nApiGuard, async (req, res) => {
  try {
    const services = (await dbAll('SELECT * FROM services WHERE active = 1 ORDER BY sortOrder ASC, name ASC')).map(s => ({ id: s.id, name: s.name, category: s.category || '', description: s.description || s.shortDescription || '', shortDescription: s.shortDescription || s.description || '', duration: s.duration == null ? null : Number(s.duration), durationMinutes: s.duration == null ? 0 : Number(s.duration), price: s.price == null ? null : Number(s.price) }));
    const specialists = (await dbAll('SELECT id, name, role FROM specialists WHERE active = 1')).filter(s => s.id !== 'any').map(s => ({ id: s.id, name: s.name, role: s.role || '' }));
    const cfg = await dbGet("SELECT name, phone, whatsapp, address, hours, workingHours FROM salón_config WHERE id = 'main'");
    res.json({ success: true, salon: cfg ? { name: cfg.name, phone: cfg.phone, whatsapp: cfg.whatsapp, address: cfg.address, hours: cfg.hours, workingHours: parseJson(cfg.workingHours, []) } : null, currency: 'EUR', services, specialists });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/integrations/n8n/availability', n8nApiGuard, async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!isDateStr(date)) return res.status(400).json({ error: 'date debe tener formato YYYY-MM-DD' });
    const now = madridNow();
    if (date < now.date) return res.status(400).json({ error: 'La fecha ya ha pasado' });
    if ((Date.parse(date + 'T12:00:00Z') - Date.parse(now.date + 'T12:00:00Z')) / 86400000 > MAX_DAYS_AHEAD) return res.status(400).json({ error: 'Solo se puede reservar con ' + MAX_DAYS_AHEAD + ' dias de antelacion como maximo' });
    const ids = String(req.query.serviceIds || '').split(',').map(x => x.trim()).filter(Boolean);
    const svc = await loadServices(ids);
    if (svc.error) return res.status(400).json({ error: svc.error });
    const slots = await computeSlots({ date, duration: svc.totalDuration, specialistId: req.query.specialistId ? String(req.query.specialistId) : null });
    res.json({ success: true, date, totalDurationMinutes: svc.totalDuration, totalPrice: svc.totalPrice, count: slots.length, slots });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

let n8nBookingQueue = Promise.resolve();
const withBookingLock = (fn) => { const run = n8nBookingQueue.then(fn, fn); n8nBookingQueue = run.catch(() => {}); return run; };

app.post('/api/integrations/n8n/appointments', n8nApiGuard, async (req, res) => {
  try {
    const out = await withBookingLock(async () => {
      const b = req.body || {};
      const clientName = String(b.clientName || '').trim().slice(0, 100);
      const phone = normalizePhone(b.clientPhone);
      const clientEmail = String(b.clientEmail || '').trim().slice(0, 150);
      const date = String(b.date || ''); const time = String(b.time || '');
      if (!clientName) return { status: 400, body: { error: 'Falta el nombre de la clienta' } };
      if (phone.length < 9 || phone.length > 15) return { status: 400, body: { error: 'Telefono no valido' } };
      if (!isDateStr(date) || toMinutes(time) === null) return { status: 400, body: { error: 'Fecha u hora no validas' } };
      const svc = await loadServices(Array.isArray(b.serviceIds) ? b.serviceIds : []);
      if (svc.error) return { status: 400, body: { error: svc.error } };
      const now = madridNow();
      if (date < now.date) return { status: 400, body: { error: 'La fecha ya ha pasado' } };
      if ((Date.parse(date + 'T12:00:00Z') - Date.parse(now.date + 'T12:00:00Z')) / 86400000 > MAX_DAYS_AHEAD) return { status: 400, body: { error: 'Fecha demasiado lejana' } };
      const all = await dbAll("SELECT * FROM appointments WHERE status IN ('Confirmada','Pendiente')");
      const mine = all.filter(a => normalizePhone(a.clientPhone) === phone);
      const same = mine.find(a => a.date === date && a.time === toHHMM(toMinutes(time)));
      if (same) return { status: 200, body: { success: true, alreadyExists: true, appointment: serializeAppointment(same) } };
      if (mine.filter(a => a.date >= now.date).length >= MAX_ACTIVE_PER_PHONE) return { status: 429, body: { error: 'Esta clienta ya tiene el maximo de citas activas', code: 'TOO_MANY_ACTIVE_APPOINTMENTS' } };
      const slots = await computeSlots({ date, duration: svc.totalDuration, specialistId: b.specialistId ? String(b.specialistId) : null });
      const slot = slots.find(s => s.time === toHHMM(toMinutes(time)));
      if (!slot) return { status: 409, body: { error: 'Ese hueco ya no esta disponible', code: 'SLOT_UNAVAILABLE', alternatives: slots.slice(0, 6).map(s => s.time) } };
      const specialistId = b.specialistId ? String(b.specialistId) : slot.specialistIds[0];
      let locator = ''; for (let i = 0; i < 20; i++) { const c = 'LGN-' + Math.floor(1000 + Math.random() * 9000); if (!(await dbGet('SELECT id FROM appointments WHERE locator = ?', [c]))) { locator = c; break; } }
      if (!locator) return { status: 500, body: { error: 'No se pudo generar el localizador' } };
      const id = 'appt_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
      const ts = new Date().toISOString();
      const notes = String(b.notes || '').trim().slice(0, 500);
      await dbRun('INSERT INTO appointments (id, locator, serviceIds, addonIds, specialistId, date, time, totalPrice, totalDuration, clientName, clientPhone, clientEmail, status, notes, createdAt, updatedAt, lastActionSource, lastActionAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [id, locator, JSON.stringify(svc.services.map(x => x.id)), '[]', specialistId, date, toHHMM(toMinutes(time)), svc.totalPrice, svc.totalDuration, clientName, phone, clientEmail, 'Confirmada', notes, ts, ts, 'n8n', ts]);
      const created = await dbGet('SELECT * FROM appointments WHERE id = ?', [id]);
      if (clientEmail) sendEmail({ to: clientEmail, subject: 'Tu cita esta confirmada - PIN ' + locator + ' - BJ Beauty', templateName: 'booking-confirmed.html', vars: { clientName, locator, date, time: created.time, totalPrice: svc.totalPrice } });
      return { status: 201, body: { success: true, appointment: serializeAppointment(created) } };
    });
    res.status(out.status).json(out.body);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/designs', requireStaff, async (req, res) => {
  try {
    const designs = await dbAll('SELECT * FROM custom_designs ORDER BY createdAt DESC');
    res.json(designs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/designs', async (req, res) => {
  try {
    const { id, code, clientName, clientPhone, clientEmail, shape, notes, imageBase64 } = req.body;
    
    await dbRun(
      `INSERT INTO custom_designs 
       (id, code, clientName, clientPhone, clientEmail, shape, notes, imageBase64, status, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, clientName, clientPhone, clientEmail, shape, notes, imageBase64, 'Pendiente', new Date().toISOString(), new Date().toISOString()]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/designs/:id', requireStaff, async (req, res) => {
  try {
    const { status } = req.body;
    
    await dbRun(
      'UPDATE custom_designs SET status = ?, updatedAt = ? WHERE id = ?',
      [status, new Date().toISOString(), req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/designs/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM custom_designs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CONFIGURACIN
app.get('/api/config', async (req, res) => {
  try {
    const config = await dbGet('SELECT * FROM salón_config WHERE id = ?', ['main']);
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', requireStaff, async (req, res) => {
  try {
    const {
      name, description, phone, email, address, hours, logo, coverPhoto,
      primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
      workingHours, blockedSlots, vacations, nailShapes, nailLengths,
      nailStyles, products
    } = req.body;

    const existing = await dbGet('SELECT id FROM salón_config WHERE id = ?', ['main']);
    const values = [
      name, description, phone, email, address, hours, logo, coverPhoto,
      primaryColor, accentColor, backgroundColor, whatsapp,
      calendarPublic === undefined ? 1 : (calendarPublic ? 1 : 0),
      JSON.stringify(workingHours ?? []),
      JSON.stringify(blockedSlots ?? []),
      JSON.stringify(vacations ?? []),
      JSON.stringify(nailShapes ?? []),
      JSON.stringify(nailLengths ?? []),
      JSON.stringify(nailStyles ?? []),
      JSON.stringify(products ?? []),
      new Date().toISOString()
    ];

    if (existing) {
      await dbRun(
        `UPDATE salón_config
         SET name = ?, description = ?, phone = ?, email = ?, address = ?, hours = ?,
             logo = ?, coverPhoto = ?, primaryColor = ?, accentColor = ?, backgroundColor = ?,
             whatsapp = ?, calendarPublic = ?, workingHours = ?, blockedSlots = ?, vacations = ?,
             nailShapes = ?, nailLengths = ?, nailStyles = ?, products = ?, updatedAt = ?
         WHERE id = ?`,
        [...values, 'main']
      );
    } else {
      await dbRun(
        `INSERT INTO salón_config
         (id, name, description, phone, email, address, hours, logo, coverPhoto,
          primaryColor, accentColor, backgroundColor, whatsapp, calendarPublic,
          workingHours, blockedSlots, vacations, nailShapes, nailLengths, nailStyles, products, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['main', ...values]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error guardando configuración:', err);
    res.status(500).json({ error: err.message });
  }
});

// SERVICIOS
app.get('/api/services', async (req, res) => {
  try {
    const services = await dbAll('SELECT * FROM services WHERE active = 1 ORDER BY sortOrder ASC, name ASC');
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', requireStaff, async (req, res) => {
  try {
    const { id, name, duration, price, description, shortDescription, longDescription, category, icon, featured, sortOrder, instagramSource } = req.body;
    const now = new Date().toISOString();
    await dbRun(
      'INSERT INTO services (id, name, duration, price, description, shortDescription, longDescription, category, icon, featured, sortOrder, instagramSource, updatedAt, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [id, name, duration ?? null, price ?? null, description || shortDescription || '', shortDescription || description || '', longDescription || '', category || 'diseno_personalizado', icon || '', featured ? 1 : 0, Number(sortOrder) || 0, instagramSource || '@bjbeauty.nails', now]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', requireStaff, async (req, res) => {
  try {
    const { name, duration, price, description, shortDescription, longDescription, category, icon, featured, sortOrder, instagramSource } = req.body;
    await dbRun(
      'UPDATE services SET name = ?, duration = ?, price = ?, description = ?, shortDescription = ?, longDescription = ?, category = ?, icon = ?, featured = ?, sortOrder = ?, instagramSource = ?, updatedAt = ? WHERE id = ?',
      [name, duration ?? null, price ?? null, description || shortDescription || '', shortDescription || description || '', longDescription || '', category || 'diseno_personalizado', icon || '', featured ? 1 : 0, Number(sortOrder) || 0, instagramSource || '', new Date().toISOString(), req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/services/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('UPDATE services SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ESPECIALISTAS
app.get('/api/specialists', async (req, res) => {
  try {
    const specialists = await dbAll('SELECT * FROM specialists WHERE active = 1');
    res.json(specialists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/specialists', requireStaff, async (req, res) => {
  try {
    const { id, name, role, photo, description } = req.body;
    
    await dbRun(
      'INSERT INTO specialists (id, name, role, photo, description, active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name, role, photo, description || '']
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/specialists/:id', requireStaff, async (req, res) => {
  try {
    const { name, role, photo, description } = req.body;
    
    await dbRun(
      'UPDATE specialists SET name = ?, role = ?, photo = ?, description = ? WHERE id = ?',
      [name, role, photo, description || '', req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/specialists/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('UPDATE specialists SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FEED PaBLICO (para instagram-autopilot / servicios externos) ====================
// Ver I:\instagram-autopilot\INTEGRATION.md para el contrato de este endpoint.
app.get('/api/public/content-feed', async (req, res) => {
  try {
    const providedKey = req.header('x-api-key');
    if (process.env.CONTENT_FEED_API_KEY && providedKey !== process.env.CONTENT_FEED_API_KEY) {
      return res.status(401).json({ error: 'API key inválida' });
    }
    const photos = await dbAll('SELECT * FROM gallery ORDER BY displayOrder ASC, uploadedAt DESC');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const feed = photos.map((p) => ({
      id: `gallery_${p.id}`,
      type: 'gallery_photo',
      imageUrl: `${baseUrl}/api/gallery/${p.id}/image`,
      title: p.title || '',
      context: p.caption || 'Foto de la galería del salón',
      createdAt: p.uploadedAt,
      consent: true
    }));
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sirve la foto de galera como imagen real (necesario para que Instagram/el
// servicio externo puedan descargarla por URL pública, no vale el base64)
app.get('/api/gallery/:id/image', async (req, res) => {
  try {
    const photo = await dbGet('SELECT photoBase64 FROM gallery WHERE id = ?', [req.params.id]);
    if (!photo?.photoBase64) return res.status(404).send('Foto no encontrada');
    const match = photo.photoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return res.status(500).send('Formato de imagen no reconocido');
    const [, mime, base64Data] = match;
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(base64Data, 'base64'));
  } catch (err) {
    res.status(500).send('Error interno');
  }
});

// GALERA
app.get('/api/gallery', async (req, res) => {
  try {
    const photos = await dbAll('SELECT * FROM gallery ORDER BY displayOrder ASC');
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gallery', requireStaff, async (req, res) => {
  try {
    const { id, photoBase64, title, caption } = req.body;
    const order = await dbGet('SELECT MAX(displayOrder) as max FROM gallery');
    const displayOrder = (order?.max || 0) + 1;
    
    await dbRun(
      'INSERT INTO gallery (id, photoBase64, title, caption, uploadedAt, displayOrder) VALUES (?, ?, ?, ?, ?, ?)',
      [id, photoBase64, title || '', caption || '', new Date().toISOString(), displayOrder]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gallery/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOLICITUDES DE CITA
app.post('/api/booking-request', async (req, res) => {
  try {
    const { clientName, clientPhone, clientEmail, serviceType, preferredDate, preferredTime, notes, createdAt } = req.body;
    const id = Date.now().toString();
    
    await dbRun(
      `INSERT INTO booking_requests 
       (id, clientName, clientPhone, clientEmail, serviceType, preferredDate, preferredTime, notes, status, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientName, clientPhone, clientEmail, serviceType, preferredDate, preferredTime, notes, 'Pendiente', createdAt]
    );

    const requestEmailVars = {
      clientName: clientName || 'Cliente',
      clientPhone: clientPhone || 'No indicado',
      clientEmail: clientEmail || 'No indicado',
      serviceType: serviceType || 'tu servicio',
      preferredDate: preferredDate || 'a confirmar',
      preferredTime: preferredTime || 'a confirmar',
      notes: notes || 'Sin comentarios',
      requestId: id
    };

    const salonNotificationEmail = process.env.SALON_NOTIFICATION_EMAIL || 'manuelalcalavilchez@gmail.com';
    const emailResults = await Promise.all([
      sendEmail({
        to: clientEmail,
        subject: 'Hemos recibido tu solicitud de cita - BJ Beauty',
        templateName: 'booking-confirmation.html',
        vars: requestEmailVars
      }),
      sendEmail({
        to: salonNotificationEmail,
        subject: `Nueva solicitud de cita - ${clientName || 'Cliente'}`,
        templateName: 'booking-request-owner.html',
        vars: requestEmailVars
      })
    ]);
    console.log('[booking-request] Resultado de correos:', JSON.stringify({
      client: emailResults[0].success,
      salon: emailResults[1].success,
      salonRecipient: salonNotificationEmail
    }));

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/booking-requests', requireStaff, async (req, res) => {
  try {
    const requests = await dbAll('SELECT * FROM booking_requests ORDER BY createdAt DESC');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/booking-requests/:id', requireStaff, async (req, res) => {
  try {
    const { status } = req.body;
    
    await dbRun(
      'UPDATE booking_requests SET status = ?, respondedAt = ? WHERE id = ?',
      [status, new Date().toISOString(), req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/booking-requests/:id', requireStaff, async (req, res) => {
  try {
    await dbRun('DELETE FROM booking_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SALUD
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Frontend de produccin: mismo origen que la API, compatible con Cloudflare/EasyPanel.
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Ruta API no encontrada' });
    }
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Inicializar y escuchar
initDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Servidor Express en http://${HOST}:${PORT}`);
    console.log(`API Base: http://localhost:${PORT}/api`);
    console.log('Base de datos: en memoria (sqlite3 mock activo)');
  });
});


