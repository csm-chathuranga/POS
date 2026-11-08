/**
 * Debug script — shows raw scanner events and POS employees side by side
 * Run: node debug.js
 */

const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const CONFIG = require('./config');

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
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
        (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d })); }
      );
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }
  return doRequest(null).then(async (r1) => {
    if (r1.status !== 401) {
      try { return { status: r1.status, data: JSON.parse(r1.body) }; } catch { return { status: r1.status, data: r1.body }; }
    }
    const params = {};
    (r1.headers['www-authenticate'] || '').replace(/(\w+)="([^"]+)"/g, (_, k, v) => { params[k] = v; });
    const { realm, nonce, qop = 'auth' } = params;
    const nc = '00000001', cnonce = crypto.randomBytes(8).toString('hex');
    const ha1 = md5(`${opts.auth.username}:${realm}:${opts.auth.password}`);
    const ha2 = md5(`${opts.method}:${opts.path}`);
    const resp = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    const authStr = [`Digest username="${opts.auth.username}"`,`realm="${realm}"`,`nonce="${nonce}"`,`uri="${opts.path}"`,`qop=${qop}`,`nc=${nc}`,`cnonce="${cnonce}"`,`response="${resp}"`].join(', ');
    const r2 = await doRequest(authStr);
    try { return { status: r2.status, data: JSON.parse(r2.body) }; } catch { return { status: r2.status, data: r2.body }; }
  });
}

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.api_base);
    const lib = url.protocol === 'https:' ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token)   headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path, method, headers },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } }); }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // 1. Fetch raw events from scanner
  console.log('\n=== SCANNER EVENTS (last 30 days) ===');
  const fromDate = new Date(Date.now() - 30 * 86400000);
  const toDate   = new Date();
  const fmt = d => d.toISOString().replace(/\.\d+Z$/, '+00:00');

  const body = JSON.stringify({
    AcsEventCond: {
      searchID: String(Date.now()), searchResultPosition: 0, maxResults: 1000,
      major: 0, minor: 0, startTime: fmt(fromDate), endTime: fmt(toDate),
    },
  });

  const result = await digestRequest({
    protocol: 'http:', hostname: CONFIG.device_ip, port: CONFIG.device_port,
    path: '/ISAPI/AccessControl/AcsEvent?format=json', method: 'POST',
    auth: { username: CONFIG.username, password: CONFIG.password },
  }, body);

  const list = result.data?.AcsEvent?.InfoList || [];
  console.log(`Total events from scanner: ${list.length}`);

  const deviceIds = [...new Set(list.map(e => String(e.employeeNoString || '')))];
  console.log('Unique device_employee_ids from scanner:', deviceIds);

  // 2. Fetch employees from POS
  console.log('\n=== POS EMPLOYEES ===');
  const loginRes = await apiRequest('POST', '/api/auth/login', { email: CONFIG.api_email, password: CONFIG.api_pass });
  if (!loginRes.data?.token) {
    console.error('Login failed:', loginRes.data);
    return;
  }
  const token = loginRes.data.token;

  const empRes = await apiRequest('GET', '/api/employees', null, token);
  const employees = empRes.data || [];
  console.log('Employees in POS:');
  for (const e of employees) {
    console.log(`  ${e.name} → device_employee_id: "${e.device_employee_id}"`);
  }

  // 3. Show matching
  console.log('\n=== MATCHING ===');
  const empMap = {};
  for (const e of employees) {
    if (e.device_employee_id) {
      empMap[e.device_employee_id] = e.name;
      empMap[String(parseInt(e.device_employee_id, 10))] = e.name;
    }
  }
  for (const did of deviceIds) {
    const match = empMap[did];
    console.log(`  Scanner ID "${did}" → ${match ? '✓ ' + match : '✗ NO MATCH'}`);
  }
}

main().catch(console.error);
