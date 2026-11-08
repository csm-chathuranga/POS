/**
 * Import attendance records from IVMS CSV export into the cloud POS API.
 * Times in the CSV are Sri Lanka local time (UTC+5:30) — converted to UTC before posting.
 *
 * Usage: node import-csv.js "path\to\Original Records Report.csv"
 */

const fs     = require('fs');
const https  = require('https');
const http   = require('http');
const path   = require('path');
const CONFIG = require('./config');

const csvFile = process.argv[2];
if (!csvFile) {
  console.error('Usage: node import-csv.js "path\\to\\file.csv"');
  process.exit(1);
}

// SLT = UTC+5:30 → subtract 5h30m to get UTC
const SLT_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function sltToUtc(dateStr) {
  // dateStr: "2026-11-07 07:52:37"
  const d = new Date(dateStr.replace(' ', 'T') + 'Z'); // parse as UTC first
  return new Date(d.getTime() - SLT_OFFSET_MS).toISOString(); // subtract SLT offset
}

function parseCsv(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // skip header
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const deviceId = cols[0].replace(/^'/, '').trim(); // remove leading '
    const timeStr  = cols[3]?.trim();
    return { device_employee_id: deviceId, punch_time_slt: timeStr };
  }).filter(r => r.device_employee_id && r.punch_time_slt);
}

function apiRequest(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.api_base);
    const lib = url.protocol === 'https:' ? https : http;
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token)   headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: urlPath, method, headers },
      (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
          catch { resolve({ status: res.statusCode, data: d }); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Read and parse CSV
  const text    = fs.readFileSync(csvFile, 'utf8');
  const records = parseCsv(text);
  console.log(`Parsed ${records.length} records from CSV`);

  // Login
  const loginRes = await apiRequest('POST', '/api/auth/login', { email: CONFIG.api_email, password: CONFIG.api_pass });
  if (!loginRes.data?.token) { console.error('Login failed:', loginRes.data); return; }
  const token = loginRes.data.token;
  console.log('Logged in to cloud API');

  // Get employees → build device_id map
  const empRes   = await apiRequest('GET', '/api/employees', null, token);
  const employees = empRes.data || [];
  const empMap   = {};
  for (const e of employees) {
    if (e.device_employee_id) {
      empMap[e.device_employee_id] = e.id;
      empMap[String(parseInt(e.device_employee_id, 10))] = e.id;
    }
  }

  console.log('\nEmployee map:');
  for (const [k, v] of Object.entries(empMap)) {
    const emp = employees.find(e => e.id === v);
    console.log(`  "${k}" → ${emp?.name}`);
  }

  // Post each record
  let saved = 0, skipped = 0, failed = 0, noMatch = 0;
  for (const r of records) {
    const employee_id = empMap[r.device_employee_id];
    if (!employee_id) {
      console.log(`  NO MATCH: device_id "${r.device_employee_id}" — skipping`);
      noMatch++;
      continue;
    }

    const punch_time = sltToUtc(r.punch_time_slt);

    const res = await apiRequest('POST', '/api/attendance/records', {
      employee_id,
      punch_time,
      direction: 'unknown',
      source: 'device',
    }, token);

    if (res.status === 201) {
      saved++;
    } else if (res.status === 409 || JSON.stringify(res.data).includes('duplicate')) {
      skipped++;
    } else {
      failed++;
      console.warn(`  FAILED (${res.status}):`, res.data);
    }
  }

  console.log(`\nDone — saved: ${saved}, duplicate/skipped: ${skipped}, no match: ${noMatch}, failed: ${failed}`);
}

main().catch(console.error);
