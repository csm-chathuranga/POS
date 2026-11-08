/**
 * Local Attendance Sync Agent
 * Runs on the PC that is on the same network as the Hikvision scanner.
 * Pulls punch events from the scanner and posts them to the cloud POS API.
 *
 * Usage:
 *   node sync.js
 *
 * Config: edit the CONFIG block below, or set environment variables.
 */

const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────

const CONFIG = require('./config');

const STATE_FILE = path.join(__dirname, '.last_sync');

// ── HELPERS ───────────────────────────────────────────────────────────────────

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function isoSL(d) {
  // Format date as ISO with +05:30 offset for SL time
  return d.toISOString().replace(/\.\d+Z$/, '+00:00');
}

function digestRequest(opts, bodyStr) {
  const lib = opts.protocol === 'https:' ? https : http;

  function doRequest(authHeader) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      if (authHeader) headers['Authorization'] = authHeader;
      if (bodyStr)    headers['Content-Length'] = Buffer.byteLength(bodyStr);

      const req = lib.request(
        { hostname: opts.hostname, port: opts.port, path: opts.path, method: opts.method, headers },
        (res) => {
          let data = '';
          res.on('data', d => { data += d; });
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        }
      );
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  return doRequest(null).then(async (r1) => {
    if (r1.status !== 401) {
      try { return { status: r1.status, data: JSON.parse(r1.body) }; }
      catch { return { status: r1.status, data: r1.body }; }
    }

    const params = {};
    (r1.headers['www-authenticate'] || '').replace(/(\w+)="([^"]+)"/g, (_, k, v) => { params[k] = v; });
    const { realm, nonce, qop = 'auth' } = params;
    const nc = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');
    const ha1  = md5(`${opts.auth.username}:${realm}:${opts.auth.password}`);
    const ha2  = md5(`${opts.method}:${opts.path}`);
    const resp = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    const authStr = [
      `Digest username="${opts.auth.username}"`,
      `realm="${realm}"`, `nonce="${nonce}"`, `uri="${opts.path}"`,
      `qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`, `response="${resp}"`,
    ].join(', ');

    const r2 = await doRequest(authStr);
    try { return { status: r2.status, data: JSON.parse(r2.body) }; }
    catch { return { status: r2.status, data: r2.body }; }
  });
}

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url  = new URL(CONFIG.api_base);
    const lib  = url.protocol === 'https:' ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token)   headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path, method, headers },
      (res) => {
        let data = '';
        res.on('data', d => { data += d; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, data }); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── MAIN SYNC ─────────────────────────────────────────────────────────────────

async function login() {
  const r = await apiRequest('POST', '/api/auth/login', {
    email: CONFIG.api_email, password: CONFIG.api_pass,
  });
  if (r.status !== 200 || !r.data?.token) {
    throw new Error(`Login failed (${r.status}): ${JSON.stringify(r.data)}`);
  }
  return r.data.token;
}

async function fetchFromScanner(fromDate, toDate) {
  const body = JSON.stringify({
    AcsEventCond: {
      searchID: String(Date.now()), searchResultPosition: 0, maxResults: 1000,
      major: 0, minor: 0, startTime: isoSL(fromDate), endTime: isoSL(toDate),
    },
  });

  const result = await digestRequest({
    protocol: 'http:',
    hostname: CONFIG.device_ip,
    port:     CONFIG.device_port,
    path:     '/ISAPI/AccessControl/AcsEvent?format=json',
    method:   'POST',
    auth:     { username: CONFIG.username, password: CONFIG.password },
  }, body);

  const list = result.data?.AcsEvent?.InfoList || [];
  return list.map(e => ({
    event_id:           String(e.serialNo),
    device_employee_id: String(e.employeeNoString || ''),
    punch_time:         e.dateTime || e.time || e.happenTime || e.eventTime,
    direction:          e.inOutStatus === 'entry' ? 'in'
                      : e.inOutStatus === 'exit'  ? 'out' : 'unknown',
  })).filter(e => e.device_employee_id && e.punch_time);
}

async function sync() {
  console.log(`\n[${new Date().toLocaleString()}] Starting sync...`);

  // Validate config
  if (!CONFIG.password)  { console.error('ERROR: Set DEVICE_PASS or edit CONFIG.password'); return; }
  if (!CONFIG.api_email) { console.error('ERROR: Set API_EMAIL or edit CONFIG.api_email'); return; }
  if (!CONFIG.api_pass)  { console.error('ERROR: Set API_PASS or edit CONFIG.api_pass'); return; }

  // Determine time range
  let lastSync = null;
  if (fs.existsSync(STATE_FILE)) {
    try { lastSync = new Date(fs.readFileSync(STATE_FILE, 'utf8').trim()); } catch {}
  }
  const fromDate = lastSync || new Date(Date.now() - CONFIG.initial_days_back * 86400000);
  const toDate   = new Date();

  console.log(`  Fetching from: ${fromDate.toISOString()}`);
  console.log(`  Fetching to:   ${toDate.toISOString()}`);

  // Fetch from scanner
  let events;
  try {
    events = await fetchFromScanner(fromDate, toDate);
    console.log(`  Fetched ${events.length} events from scanner`);
  } catch (e) {
    console.error('  ERROR fetching from scanner:', e.message);
    return;
  }

  if (!events.length) {
    fs.writeFileSync(STATE_FILE, toDate.toISOString());
    console.log('  No new events. Done.');
    return;
  }

  // Login to cloud API
  let token;
  try {
    token = await login();
    console.log('  Logged in to cloud API');
  } catch (e) {
    console.error('  ERROR logging in:', e.message);
    return;
  }

  // Post records to cloud API
  // GET employees to build device_employee_id → employee_id map
  const empRes = await apiRequest('GET', '/api/employees', null, token);
  const employees = empRes.data || [];
  const empMap = {};
  for (const e of employees) {
    if (e.device_employee_id) {
      empMap[e.device_employee_id] = e.id;
      empMap[String(parseInt(e.device_employee_id, 10))] = e.id;
    }
  }

  let saved = 0, skipped = 0, failed = 0;
  for (const ev of events) {
    const employee_id = empMap[ev.device_employee_id];
    if (!employee_id) { skipped++; continue; }

    try {
      const r = await apiRequest('POST', '/api/attendance/records', {
        employee_id, punch_time: ev.punch_time, direction: ev.direction,
        source: 'device', event_id: ev.event_id,
      }, token);

      if (r.status === 201) saved++;
      else if (r.status === 409 || (r.data?.error || '').includes('duplicate')) skipped++;
      else { failed++; console.warn(`  WARN record failed (${r.status}):`, r.data); }
    } catch (e) {
      failed++;
      console.warn('  WARN post error:', e.message);
    }
  }

  fs.writeFileSync(STATE_FILE, toDate.toISOString());
  console.log(`  Done — saved: ${saved}, skipped/duplicate: ${skipped}, failed: ${failed}`);
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────

const loop = process.argv.includes('--loop');

if (loop) {
  console.log(`Running in loop mode — syncing every ${CONFIG.interval_min} minutes`);
  sync();
  setInterval(sync, CONFIG.interval_min * 60 * 1000);
} else {
  sync();
}
