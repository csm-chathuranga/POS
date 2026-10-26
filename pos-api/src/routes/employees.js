const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { postSalaryPayment } = require('../helpers/accounting');

async function requireModules(req, res, next) {
  const rows = await req.models.Setting.findAll({
    where: { key: ['module.payroll.enabled', 'module.accounting.enabled'] },
  });
  const on = k => rows.find(r => r.key === k)?.value === 'true';
  if (!on('module.payroll.enabled')) return res.status(403).json({ error: 'Payroll module is not enabled' });
  if (!on('module.accounting.enabled')) return res.status(403).json({ error: 'Payroll requires the Accounting module' });
  next();
}

router.use(auth, (req, res, next) => requireModules(req, res, next).catch(next));

router.get('/', auth, async (req, res) => {
  const { Employee } = req.models;
  res.json(await Employee.findAll({ where: { active: true }, order: [['name', 'ASC']] }));
});

router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  const { Employee } = req.models;
  try {
    res.status(201).json(await Employee.create(req.body));
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  const { Employee } = req.models;
  const e = await Employee.findByPk(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json(e);
});

router.put('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Employee } = req.models;
  const e = await Employee.findByPk(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  await e.update(req.body);
  res.json(e);
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Employee, SalaryPayment } = req.models;
  const e = await Employee.findByPk(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  // Soft-delete: mark inactive so history is preserved
  await e.update({ active: false });
  res.json({ message: 'Employee deactivated' });
});

router.get('/:id/salary-history', auth, async (req, res) => {
  const { Employee, SalaryPayment, User } = req.models;
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });
  const payments = await SalaryPayment.findAll({
    where: { employee_id: employee.id },
    include: [{ model: User, as: 'user', attributes: ['name'] }],
    order: [['id', 'DESC']],
  });
  res.json({ employee, payments });
});

router.post('/:id/pay-salary', auth, role('admin', 'manager'), async (req, res) => {
  const { Employee, SalaryPayment, CashAdvance } = req.models;
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });

  const amount   = parseFloat(req.body.amount);
  const period   = req.body.period;
  const deductAdvanceIds = req.body.deduct_advance_ids || []; // array of advance IDs to settle

  if (!amount || amount <= 0) return res.status(422).json({ error: 'Invalid amount' });
  if (!period) return res.status(422).json({ error: 'period is required (YYYY-MM)' });

  const d      = new Date();
  const ref_no = `SAL-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${Date.now().toString().slice(-5)}`;

  const payment = await SalaryPayment.create({
    ref_no,
    employee_id: employee.id,
    user_id:     req.user.id,
    period,
    amount,
    note: req.body.note || null,
  });

  // Mark selected advances as deducted
  if (deductAdvanceIds.length) {
    await CashAdvance.update(
      { deducted: true, salary_payment_id: payment.id },
      { where: { id: deductAdvanceIds, employee_id: employee.id, deducted: false } }
    );
  }

  postSalaryPayment(req.models, {
    ref_no,
    amount,
    employee_name: employee.name,
    period,
    user_id: req.user.id,
  });

  res.status(201).json({ payment, employee });
});

// ── Cash Advances ─────────────────────────────────────────────────────────────

const advInitialized = new Set();
async function lazyAdvance(req, res, next) {
  if (!advInitialized.has(req.tenant)) {
    await require('../lib/attendance').ensureCashAdvanceTable(req.db);
    advInitialized.add(req.tenant);
  }
  next();
}

router.use('/:id/advances', auth, (req, res, next) => lazyAdvance(req, res, next).catch(next));

router.get('/:id/advances', async (req, res) => {
  const { CashAdvance, User } = req.models;
  const advances = await CashAdvance.findAll({
    where: { employee_id: req.params.id },
    include: [{ model: User, as: 'givenBy', attributes: ['name'] }],
    order: [['given_date', 'DESC']],
  });
  const outstanding = advances
    .filter(a => !a.deducted)
    .reduce((s, a) => s + parseFloat(a.amount), 0);
  res.json({ advances, outstanding });
});

router.post('/:id/advances', role('admin', 'manager'), async (req, res) => {
  const { CashAdvance, Employee } = req.models;
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });

  const { amount, note, given_date } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(422).json({ error: 'Invalid amount' });
  if (!given_date) return res.status(422).json({ error: 'given_date is required' });

  const adv = await CashAdvance.create({
    employee_id: employee.id,
    amount:      parseFloat(amount),
    note:        note || null,
    given_date,
    given_by:    req.user.id,
  });
  res.status(201).json(adv);
});

router.delete('/:id/advances/:advId', role('admin', 'manager'), async (req, res) => {
  const { CashAdvance } = req.models;
  const adv = await CashAdvance.findOne({ where: { id: req.params.advId, employee_id: req.params.id } });
  if (!adv) return res.status(404).json({ error: 'Not found' });
  if (adv.deducted) return res.status(409).json({ error: 'Already deducted from salary — cannot delete' });
  await adv.destroy();
  res.json({ ok: true });
});

module.exports = router;
