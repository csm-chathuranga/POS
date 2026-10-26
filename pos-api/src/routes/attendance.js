const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { Op } = require('sequelize');

// Lazy table creation — safe for tenants where payroll was enabled before this code deployed
const initialized = new Set();
async function lazyEnsure(req, res, next) {
  if (!initialized.has(req.tenant)) {
    await require('../lib/attendance').ensureAttendanceTables(req.db);
    initialized.add(req.tenant);
  }
  next();
}

async function requirePayroll(req, res, next) {
  const rows = await req.models.Setting.findAll({
    where: { key: ['module.payroll.enabled', 'module.accounting.enabled'] },
  });
  const on = k => rows.find(r => r.key === k)?.value === 'true';
  if (!on('module.payroll.enabled')) return res.status(403).json({ error: 'Payroll module not enabled' });
  next();
}

router.use(auth, (req, res, next) => requirePayroll(req, res, next).catch(next));
router.use((req, res, next) => lazyEnsure(req, res, next).catch(next));

// ── Settings ─────────────────────────────────────────────────────────────────

router.get('/settings', async (req, res) => {
  const { AttendanceSetting } = req.models;
  let s = await AttendanceSetting.findOne();
  if (!s) s = await AttendanceSetting.create({});
  const out = s.toJSON();
  if (out.password) out.password = '••••••••';
  res.json(out);
});

router.put('/settings', role('admin', 'manager'), async (req, res) => {
  const { AttendanceSetting } = req.models;
  let s = await AttendanceSetting.findOne();
  if (!s) s = await AttendanceSetting.create({});

  const { device_ip, port, username, password, poll_interval_min, enabled } = req.body;
  const update = { device_ip, port, username, poll_interval_min, enabled };
  if (password && password !== '••••••••') update.password = password;
  await s.update(update);

  const out = s.toJSON();
  if (out.password) out.password = '••••••••';
  res.json(out);
});

// ── Sync from device ──────────────────────────────────────────────────────────

router.post('/sync', role('admin', 'manager'), async (req, res) => {
  const { AttendanceSetting, AttendanceRecord, Employee } = req.models;
  const settings = await AttendanceSetting.findOne();
  if (!settings?.device_ip) return res.status(400).json({ error: 'Device not configured' });

  const { fetchEvents } = require('../lib/hikvision');

  // Always pull the full current month (+ last 7 days as buffer for month-boundary scans).
  // Duplicates are silently skipped via event_id unique key — no incremental window needed.
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  const toDate   = now;

  const fmt = d => d.toISOString().replace(/\.\d+Z$/, '+00:00');
  const events = await fetchEvents(settings, fmt(fromDate), fmt(toDate));

  // Build device_employee_id → our employee_id map
  const employees = await Employee.findAll({ where: { active: true } });
  const empMap = {};
  for (const e of employees) {
    if (e.device_employee_id) {
      // match with and without leading zeros
      empMap[e.device_employee_id] = e.id;
      empMap[String(parseInt(e.device_employee_id, 10))] = e.id;
    }
  }

  let saved = 0;
  for (const ev of events) {
    const employee_id = empMap[ev.device_employee_id];
    if (!employee_id) continue;
    try {
      await AttendanceRecord.create({ ...ev, employee_id, source: 'device' });
      saved++;
    } catch { /* duplicate event_id — skip */ }
  }

  await settings.update({ last_synced_at: toDate });
  res.json({ fetched: events.length, saved, last_synced_at: toDate });
});

// ── Debug — raw device response ──────────────────────────────────────────────

router.get('/debug-device', role('admin', 'manager'), async (req, res) => {
  const { AttendanceSetting } = req.models;
  const settings = await AttendanceSetting.findOne();
  if (!settings?.device_ip) return res.status(400).json({ error: 'Device not configured' });

  const http   = require('http');
  const crypto = require('crypto');

  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const toDate   = new Date();
  const fmt = d => d.toISOString().replace(/\.\d+Z$/, '+00:00');

  const body = JSON.stringify({
    AcsEventCond: {
      searchID: String(Date.now()), searchResultPosition: 0, maxResults: 50,
      major: 5, minor: 0, startTime: fmt(fromDate), endTime: fmt(toDate),
    },
  });

  try {
    // First request to get digest challenge
    const r1 = await new Promise((resolve, reject) => {
      const req2 = http.request(
        { hostname: settings.device_ip, port: settings.port || 80,
          path: '/ISAPI/AccessControl/AcsEvent?format=json', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res2) => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => resolve({ status: res2.statusCode, headers: res2.headers, body: d })); }
      );
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    if (r1.status !== 401) return res.json({ step: 'no-auth-challenge', status: r1.status, body: r1.body });

    const ch = {};
    (r1.headers['www-authenticate'] || '').replace(/(\w+)="([^"]+)"/g, (_, k, v) => { ch[k] = v; });
    const { realm, nonce, qop = 'auth' } = ch;
    const nc = '00000001'; const cnonce = crypto.randomBytes(8).toString('hex');
    const ha1 = crypto.createHash('md5').update(`${settings.username}:${realm}:${settings.password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`POST:/ISAPI/AccessControl/AcsEvent?format=json`).digest('hex');
    const resp = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
    const authStr = `Digest username="${settings.username}", realm="${realm}", nonce="${nonce}", uri="/ISAPI/AccessControl/AcsEvent?format=json", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${resp}"`;

    const r2 = await new Promise((resolve, reject) => {
      const req2 = http.request(
        { hostname: settings.device_ip, port: settings.port || 80,
          path: '/ISAPI/AccessControl/AcsEvent?format=json', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Authorization': authStr } },
        (res2) => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => resolve({ status: res2.statusCode, body: d })); }
      );
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    let parsed;
    try { parsed = JSON.parse(r2.body); } catch { parsed = r2.body; }
    res.json({ status: r2.status, timeRange: { from: fmt(fromDate), to: fmt(toDate) }, raw: parsed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Records ───────────────────────────────────────────────────────────────────

router.get('/records', async (req, res) => {
  const { AttendanceRecord, Employee } = req.models;
  const { employee_id, month } = req.query;
  const where = {};
  if (employee_id) where.employee_id = employee_id;
  if (month) {
    const [y, m] = month.split('-').map(Number);
    where.punch_time = { [Op.gte]: new Date(y, m - 1, 1), [Op.lt]: new Date(y, m, 1) };
  }
  const records = await AttendanceRecord.findAll({
    where,
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'name'] }],
    order: [['punch_time', 'ASC']],
  });
  res.json(records);
});

router.post('/records', role('admin', 'manager'), async (req, res) => {
  const { AttendanceRecord } = req.models;
  const { employee_id, punch_time, direction } = req.body;
  if (!employee_id || !punch_time) return res.status(422).json({ error: 'employee_id and punch_time required' });
  const r = await AttendanceRecord.create({
    employee_id, punch_time, direction: direction || 'unknown', source: 'manual',
  });
  res.status(201).json(r);
});

router.delete('/records/:id', role('admin', 'manager'), async (req, res) => {
  const { AttendanceRecord } = req.models;
  const r = await AttendanceRecord.findByPk(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  await r.destroy();
  res.json({ ok: true });
});

// ── Summary (per-employee for a month) ───────────────────────────────────────

router.get('/summary', async (req, res) => {
  const { AttendanceRecord, Employee } = req.models;
  const { month } = req.query;
  if (!month) return res.status(422).json({ error: 'month required (YYYY-MM)' });

  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 1);

  const [employees, records] = await Promise.all([
    Employee.findAll({ where: { active: true } }),
    AttendanceRecord.findAll({ where: { punch_time: { [Op.gte]: start, [Op.lt]: end } } }),
  ]);

  // Count working days (Mon–Sat) in the month
  const daysInMonth = new Date(y, m, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(y, m - 1, d).getDay() !== 0) workingDays++;
  }

  // Group records: employee_id → Set<day>  (day in Sri Lanka time UTC+5:30)
  const SLT_OFFSET = 5.5 * 60 * 60 * 1000;
  const byEmp = {};
  for (const r of records) {
    const eid = String(r.employee_id);
    const day = new Date(new Date(r.punch_time).getTime() + SLT_OFFSET).getUTCDate();
    if (!byEmp[eid]) byEmp[eid] = new Set();
    byEmp[eid].add(day);
  }

  res.json(employees.map(e => {
    const present = byEmp[String(e.id)]?.size || 0;
    return {
      employee_id:   e.id,
      employee_name: e.name,
      present_days:  present,
      working_days:  workingDays,
      absent_days:   Math.max(0, workingDays - present),
    };
  }));
});

module.exports = router;
