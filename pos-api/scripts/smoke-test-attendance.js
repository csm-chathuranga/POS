/**
 * Attendance module smoke test.
 * - Tests every endpoint (settings, sync, records CRUD, summary)
 * - Seeds sample records for Oct + Nov 2026 for both employees
 * - Data is KEPT after the test for visual verification in the UI
 *
 * Usage: node scripts/smoke-test-attendance.js [hostname]
 */
require('dotenv').config();
const http = require('http');

const HOST     = 'localhost';
const PORT     = 8000;
const TENANT   = process.argv[2] || 'localhost';

let token = '';
let pass  = 0;
let fail  = 0;
let DB    = null;

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', 'x-tenant': TENANT };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const r = http.request({ hostname: HOST, port: PORT, path: `/api${path}`, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(d); } catch { json = d; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

function ok(label, res, checkFn) {
  const passed = res.status >= 200 && res.status < 300 && (!checkFn || checkFn(res.body));
  if (passed) { console.log(`  ✓  ${label}`); pass++; }
  else { console.log(`  ✗  ${label}  →  HTTP ${res.status}  ${JSON.stringify(res.body).slice(0, 120)}`); fail++; }
  return res.body;
}

function expect(label, res, expectedStatus, checkFn) {
  const passed = res.status === expectedStatus && (!checkFn || checkFn(res.body));
  if (passed) { console.log(`  ✓  ${label}  →  ${expectedStatus}`); pass++; }
  else { console.log(`  ✗  ${label}  →  got HTTP ${res.status}  ${JSON.stringify(res.body).slice(0, 100)}`); fail++; }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(55 - title.length)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nAttendance Smoke Test  →  http://${HOST}:${PORT}  tenant: ${TENANT}`);
  console.log('='.repeat(60));

  // ── 1. Auth — generate token directly from JWT_SECRET ─────────────────────
  section('Auth');
  {
    const jwt = require('jsonwebtoken');
    const { getMasterDb } = require('../src/config/masterDb');
    const { Sequelize } = require('sequelize');
    const masterCtx = getMasterDb();
    const t = (await masterCtx.Tenant.findOne({ where: { hostname: TENANT, active: true } })).dataValues;
    DB = new Sequelize(t.db_name, t.db_user, t.db_password, { host: t.db_host || 'localhost', dialect: 'mysql', logging: false });
    await DB.authenticate();

    // Find admin user
    const [[adminUser]] = await DB.query("SELECT id, email, name FROM users WHERE email LIKE '%admin%' LIMIT 1");
    if (!adminUser) { console.log('  ✗  No admin user found in DB'); fail++; }
    else {
      token = jwt.sign(
        { userId: adminUser.id, email: adminUser.email, role: 'admin', tenant: TENANT },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      console.log(`  ✓  JWT generated for ${adminUser.email} (${adminUser.name})`);
      pass++;
    }
    await masterCtx.master.close();
  }

  // ── 2. Settings ────────────────────────────────────────────────────────────
  section('Device Settings');

  const s1 = await req('GET', '/attendance/settings');
  const settings = ok('GET /attendance/settings', s1, b => b && b.id);

  const s2 = await req('PUT', '/attendance/settings', {
    device_ip:         settings?.device_ip || '192.168.1.64',
    port:              settings?.port       || 80,
    username:          settings?.username   || 'admin',
    password:          '',           // blank = keep existing
    poll_interval_min: 5,
    enabled:           true,
  });
  ok('PUT /attendance/settings', s2, b => b && b.id);

  // ── 3. Sync ────────────────────────────────────────────────────────────────
  section('Sync');

  const syncRes = await req('POST', '/attendance/sync');
  if (syncRes.status === 200) {
    console.log(`  ✓  POST /attendance/sync  →  fetched:${syncRes.body.fetched}  saved:${syncRes.body.saved}`);
    pass++;
  } else if (syncRes.status >= 400 && syncRes.body?.error?.toLowerCase().includes('device')) {
    console.log(`  ~  POST /attendance/sync — device unreachable (expected in CI): ${syncRes.body.error}`);
    pass++; // not a code failure
  } else {
    console.log(`  ✗  POST /attendance/sync  →  ${syncRes.status} ${JSON.stringify(syncRes.body)}`);
    fail++;
  }

  // ── 4. Seed sample records ─────────────────────────────────────────────────
  section('Seed Sample Records');

  // Seed weekdays in Oct + Nov for both employees
  // employee 1 = Chathuranga, employee 2 = Test Employee
  const seeds = [];

  // Oct 2026: employee 1 present Mon-Sat, employee 2 missing a few days
  const emp1DaysOct  = [1,2,3,5,6,7,8,9,10,12,13,14,15,16,17,19,20,21,22,23,24,26,27,28,29,30,31];
  const emp2DaysOct  = [1,2,3,5,6,8,9,10,12,13,15,16,17,19,20,22,23,24,26,27,29,30]; // a few absent

  // Nov 2026: partial month (first ~15 days)
  const emp1DaysNov  = [2,3,4,5,6,7,9,10,11,12,13,14];
  const emp2DaysNov  = [2,3,5,6,9,10,12,13];

  for (const day of emp1DaysOct) {
    seeds.push({ employee_id: 1, punch_time: `2026-10-${String(day).padStart(2,'0')}T08:30:00+05:30`, direction: 'in',  source: 'manual' });
    seeds.push({ employee_id: 1, punch_time: `2026-10-${String(day).padStart(2,'0')}T17:00:00+05:30`, direction: 'out', source: 'manual' });
  }
  for (const day of emp2DaysOct) {
    seeds.push({ employee_id: 2, punch_time: `2026-10-${String(day).padStart(2,'0')}T08:45:00+05:30`, direction: 'in',  source: 'manual' });
    seeds.push({ employee_id: 2, punch_time: `2026-10-${String(day).padStart(2,'0')}T17:15:00+05:30`, direction: 'out', source: 'manual' });
  }
  for (const day of emp1DaysNov) {
    seeds.push({ employee_id: 1, punch_time: `2026-11-${String(day).padStart(2,'0')}T08:30:00+05:30`, direction: 'in',  source: 'manual' });
    seeds.push({ employee_id: 1, punch_time: `2026-11-${String(day).padStart(2,'0')}T17:00:00+05:30`, direction: 'out', source: 'manual' });
  }
  for (const day of emp2DaysNov) {
    seeds.push({ employee_id: 2, punch_time: `2026-11-${String(day).padStart(2,'0')}T08:45:00+05:30`, direction: 'in',  source: 'manual' });
    seeds.push({ employee_id: 2, punch_time: `2026-11-${String(day).padStart(2,'0')}T17:15:00+05:30`, direction: 'out', source: 'manual' });
  }

  // Insert via DB directly — INSERT IGNORE skips existing punch_times per employee
  let seeded = 0;
  for (const s of seeds) {
    // Convert ISO-8601 with offset to UTC for MySQL DATETIME
    const utcStr = new Date(s.punch_time).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
    const [, meta] = await DB.query(
      `INSERT IGNORE INTO attendance_records (employee_id, punch_time, direction, source, created_at, updated_at)
       VALUES (${s.employee_id}, '${utcStr}', '${s.direction}', '${s.source}', NOW(), NOW())`
    );
    seeded += meta?.affectedRows ?? 0;
  }
  console.log(`  ✓  Seeded ${seeded} records via DB (${seeds.length - seeded} already existed / skipped)`);
  pass++;

  // ── 5. Records — read & filter ─────────────────────────────────────────────
  section('Records — Read & Filter');

  const rAll = await req('GET', '/attendance/records');
  ok('GET /attendance/records (all)', rAll, b => Array.isArray(b));
  console.log(`       total records in DB: ${rAll.body?.length ?? '?'}`);

  const rOct = await req('GET', '/attendance/records?month=2026-10');
  ok('GET /attendance/records?month=2026-10', rOct, b => Array.isArray(b) && b.length > 0);
  console.log(`       Oct records: ${rOct.body?.length ?? '?'}`);

  const rEmp1 = await req('GET', '/attendance/records?employee_id=1&month=2026-10');
  ok('GET /attendance/records?employee_id=1&month=2026-10', rEmp1, b => Array.isArray(b) && b.length > 0);
  console.log(`       Chathuranga Oct records: ${rEmp1.body?.length ?? '?'}`);

  const rNov = await req('GET', '/attendance/records?month=2026-11');
  ok('GET /attendance/records?month=2026-11', rNov, b => Array.isArray(b));
  console.log(`       Nov records: ${rNov.body?.length ?? '?'}`);

  // ── 6. Manual add + delete ─────────────────────────────────────────────────
  section('Records — Manual Add & Delete');

  const addRes = await req('POST', '/attendance/records', {
    employee_id: 2,
    punch_time:  '2026-10-07T09:00:00+05:30',
    direction:   'in',
  });
  const addedId = addRes.body?.id;
  if (addRes.status === 201 && addedId) {
    console.log(`  ✓  POST /attendance/records  →  id ${addedId}`);
    pass++;
    // delete it
    const delRes = await req('DELETE', `/attendance/records/${addedId}`);
    ok(`DELETE /attendance/records/${addedId}`, delRes, b => b?.ok === true);
  } else if (addRes.status === 409 || (addRes.body?.message || '').includes('unique')) {
    console.log(`  ~  POST /attendance/records — record already exists (idempotent seed)`);
    pass++;
  } else {
    console.log(`  ✗  POST /attendance/records  →  ${addRes.status} ${JSON.stringify(addRes.body)}`);
    fail++;
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  section('Summary');

  const sumOct = await req('GET', '/attendance/summary?month=2026-10');
  ok('GET /attendance/summary?month=2026-10', sumOct, b => Array.isArray(b) && b.length > 0);
  if (Array.isArray(sumOct.body)) {
    sumOct.body.forEach(e => {
      console.log(`       ${e.employee_name}: present=${e.present_days} absent=${e.absent_days} working=${e.working_days}`);
    });
  }

  const sumNov = await req('GET', '/attendance/summary?month=2026-11');
  ok('GET /attendance/summary?month=2026-11', sumNov, b => Array.isArray(b));
  if (Array.isArray(sumNov.body)) {
    sumNov.body.forEach(e => {
      console.log(`       ${e.employee_name}: present=${e.present_days} absent=${e.absent_days} working=${e.working_days}`);
    });
  }

  const sumNoMonth = await req('GET', '/attendance/summary');
  expect('GET /attendance/summary (no month) → 422', sumNoMonth, 422, b => b?.error);

  // ── 8. New Employee — full lifecycle ──────────────────────────────────────
  section('New Employee Lifecycle');

  // Create
  const newEmpRes = await req('POST', '/employees', {
    name:             'Sampath Perera',
    position:         'Sales Associate',
    phone:            '0771234567',
    basic_salary:     35000,
    hired_date:       '2026-10-01',
    device_employee_id: '00000002',
    salary_calculation: 'daily_rate',
  });
  const newEmp = ok('POST /employees — create Sampath Perera', newEmpRes, b => b?.id);
  const newEmpId = newEmp?.id;

  if (newEmpId) {
    // Read back
    const getEmpRes = await req('GET', `/employees/${newEmpId}`);
    ok(`GET /employees/${newEmpId}`, getEmpRes, b => b?.name === 'Sampath Perera' && b?.device_employee_id === '00000002');

    // Update salary calc method
    const updEmpRes = await req('PUT', `/employees/${newEmpId}`, { salary_calculation: 'deduction' });
    ok(`PUT /employees/${newEmpId} — change calc to deduction`, updEmpRes, b => b?.salary_calculation === 'deduction');

    // Seed 15 Oct weekdays for new employee via DB
    const newEmpDays = [1,2,3,5,6,7,8,9,10,12,13,14,15,16,17];
    let newSeeded = 0;
    for (const day of newEmpDays) {
      const d = String(day).padStart(2, '0');
      for (const [h, dir] of [['08:15', 'in'], ['17:30', 'out']]) {
        const utcStr = new Date(`2026-10-${d}T${h}:00+05:30`).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
        const [, meta] = await DB.query(
          `INSERT IGNORE INTO attendance_records (employee_id, punch_time, direction, source, created_at, updated_at)
           VALUES (${newEmpId}, '${utcStr}', '${dir}', 'manual', NOW(), NOW())`
        );
        newSeeded += meta?.affectedRows ?? 0;
      }
    }
    console.log(`  ✓  Seeded ${newSeeded} attendance records for Sampath (Oct, ${newEmpDays.length} days in/out)`);
    pass++;

    // Summary should include new employee
    const sumWithNew = await req('GET', '/attendance/summary?month=2026-10');
    ok('GET /attendance/summary — includes new employee', sumWithNew, b => {
      const e = b?.find(x => x.employee_id === newEmpId);
      return e && e.present_days === newEmpDays.length;
    });
    const newEmpSummary = sumWithNew.body?.find(x => x.employee_id === newEmpId);
    if (newEmpSummary) {
      console.log(`       Sampath: present=${newEmpSummary.present_days} absent=${newEmpSummary.absent_days} working=${newEmpSummary.working_days}`);
    }

    // Records filter by new employee
    const newEmpRecs = await req('GET', `/attendance/records?employee_id=${newEmpId}&month=2026-10`);
    ok(`GET /attendance/records?employee_id=${newEmpId}`, newEmpRecs, b => Array.isArray(b) && b.length === newEmpDays.length * 2);
    console.log(`       Records fetched: ${newEmpRecs.body?.length ?? '?'} (expected ${newEmpDays.length * 2})`);

    // Device ID lookup — verify empMap would match "2" and "00000002"
    const [[empRow]] = await DB.query(`SELECT id, device_employee_id FROM employees WHERE id = ${newEmpId}`);
    const devId = empRow?.device_employee_id;
    const matchExact = devId === '00000002';
    const matchStripped = String(parseInt(devId, 10)) === '2';
    if (matchExact && matchStripped) {
      console.log(`  ✓  device_employee_id mapping: "${devId}" matches both "00000002" and "2"`);
      pass++;
    } else {
      console.log(`  ✗  device_employee_id mapping failed: got "${devId}"`);
      fail++;
    }
  }

  // ── 9. Edge Cases ──────────────────────────────────────────────────────────
  section('Edge Cases');

  const badRec = await req('POST', '/attendance/records', { direction: 'in' }); // missing employee_id
  expect('POST /attendance/records missing fields → 422', badRec, 422, b => b?.error);

  const delMissing = await req('DELETE', '/attendance/records/99999');
  expect('DELETE /attendance/records/99999 → 404', delMissing, 404, b => b?.error);

  // ── Result ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`  PASSED: ${pass}   FAILED: ${fail}`);
  if (fail === 0) console.log('  ALL TESTS PASSED — sample data kept in DB');
  else            console.log('  Some tests failed — check output above');
  console.log('='.repeat(60) + '\n');

  if (DB) await DB.close();
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
