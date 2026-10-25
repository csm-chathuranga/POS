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
  const { Employee, SalaryPayment } = req.models;
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Not found' });

  const amount = parseFloat(req.body.amount);
  const period = req.body.period; // e.g. "2024-10"
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

  postSalaryPayment(req.models, {
    ref_no,
    amount,
    employee_name: employee.name,
    period,
    user_id: req.user.id,
  });

  res.status(201).json({ payment, employee });
});

module.exports = router;
