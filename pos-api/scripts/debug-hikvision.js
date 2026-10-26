/**
 * Quick diagnostic: pull raw events directly from Hikvision device.
 * Usage: node scripts/debug-hikvision.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');
const http   = require('http');
const crypto = require('crypto');

function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }

async function rawRequest(ip, port, user, pass, bodyStr) {
  function req(authHeader) {
    return new Promise((resolve, reject) => {
      const hdrs = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) };
      if (authHeader) hdrs['Authorization'] = authHeader;
      const r = http.request({ hostname: ip, port, path: '/ISAPI/AccessControl/AcsEvent?format=json', method: 'POST', headers: hdrs },
        res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d })); });
      r.on('error', reject);
      r.write(bodyStr);
      r.end();
    });
  }

  const r1 = await req(null);
  if (r1.status !== 401) return r1;

  const ch = {};
  (r1.headers['www-authenticate'] || '').replace(/(\w+)="([^"]+)"/g, (_, k, v) => { ch[k] = v; });
  const { realm, nonce, qop = 'auth' } = ch;
  const nc = '00000001', cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${user}:${realm}:${pass}`);
  const ha2  = md5('POST:/ISAPI/AccessControl/AcsEvent?format=json');
  const resp = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  const auth = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="/ISAPI/AccessControl/AcsEvent?format=json", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${resp}"`;
  return req(auth);
}

async function main() {
  const hostname = process.argv[2] || 'localhost';
  const { master, Tenant } = getMasterDb();
  await master.authenticate();
  const tenant = await Tenant.findOne({ where: { hostname, active: true } });
  if (!tenant) { console.error(`Tenant "${hostname}" not found`); process.exit(1); }
  const t = tenant.dataValues;
  const db = new Sequelize(t.db_name, t.db_user, t.db_password, {
    host: t.db_host || 'localhost', port: parseInt(t.db_port || '3306'), dialect: 'mysql', logging: false,
  });
  await db.authenticate();
  const [[row]] = await db.query('SELECT * FROM attendance_settings LIMIT 1');
  if (!row) { console.log('No attendance_settings row found'); process.exit(1); }

  console.log('Device:', row.device_ip, 'port:', row.port, 'user:', row.username);
  console.log('last_synced_at:', row.last_synced_at);

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to   = new Date();
  const fmt  = d => d.toISOString().replace(/\.\d+Z$/, '+00:00');

  console.log('\n── Testing with major:5 (access events) ────────────────────');
  const body5 = JSON.stringify({ AcsEventCond: { searchID: String(Date.now()), searchResultPosition: 0, maxResults: 100, major: 5, minor: 0, startTime: fmt(from), endTime: fmt(to) } });
  try {
    const r5 = await rawRequest(row.device_ip, row.port || 80, row.username, row.password, body5);
    console.log('HTTP status:', r5.status);
    let parsed; try { parsed = JSON.parse(r5.body); } catch { parsed = r5.body; }
    console.log('Raw response:', JSON.stringify(parsed, null, 2));
    const list = parsed?.AcsEvent?.InfoList || [];
    console.log(`\nEvents found: ${list.length}`);
    if (list.length) {
      list.slice(0, 5).forEach((e, i) => {
        console.log(`\n  Event #${i+1}:`);
        console.log('    Keys:', Object.keys(e).join(', '));
        console.log('    employeeNoString:', e.employeeNoString);
        console.log('    dateTime:', e.dateTime);
        console.log('    time:', e.time);
        console.log('    happenTime:', e.happenTime);
        console.log('    eventTime:', e.eventTime);
        console.log('    inOutStatus:', e.inOutStatus);
        console.log('    serialNo:', e.serialNo);
      });
    }
  } catch (e) { console.log('ERROR:', e.message); }

  console.log('\n── Testing with major:0 (all events) ───────────────────────');
  const body0 = JSON.stringify({ AcsEventCond: { searchID: String(Date.now()), searchResultPosition: 0, maxResults: 100, major: 0, minor: 0, startTime: fmt(from), endTime: fmt(to) } });
  try {
    const r0 = await rawRequest(row.device_ip, row.port || 80, row.username, row.password, body0);
    console.log('HTTP status:', r0.status);
    let parsed; try { parsed = JSON.parse(r0.body); } catch { parsed = r0.body; }
    const list = parsed?.AcsEvent?.InfoList || [];
    console.log(`Events found: ${list.length}`);
    if (list.length && list.length !== (JSON.parse(body5)?.AcsEventCond ? 0 : 0)) {
      list.slice(0, 3).forEach((e, i) => console.log(`  Event #${i+1} keys:`, Object.keys(e).join(', ')));
    }
  } catch (e) { console.log('ERROR:', e.message); }

  await db.close();
  await master.close();
}

main().catch(e => { console.error(e); process.exit(1); });
