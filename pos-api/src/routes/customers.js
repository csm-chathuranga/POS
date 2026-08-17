const router = require('express').Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { Customer } = req.models;
  const where = {};
  if (req.query.search) {
    const s = req.query.search;
    where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { phone: { [Op.like]: `%${s}%` } }];
  }
  const page  = parseInt(req.query.page || '1');
  const limit = 20;
  const { count, rows } = await Customer.findAndCountAll({ where, order: [['name', 'ASC']], limit, offset: (page - 1) * limit });
  res.json({ data: rows, total: count, page, last_page: Math.ceil(count / limit) });
});

function sanitise(body) {
  const { client_id, ...data } = body;
  if (data.phone === '') data.phone = null;
  if (data.email === '') data.email = null;
  return data;
}

router.post('/', auth, async (req, res) => {
  const { Customer } = req.models;
  try {
    res.status(201).json(await Customer.create(sanitise(req.body)));
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.post('/quick-add', auth, async (req, res) => {
  const { Customer } = req.models;
  const customer = await Customer.create({ name: req.body.name, phone: req.body.phone ?? null, active: true });
  res.status(201).json({ customer: { id: customer.id, name: customer.name, phone: customer.phone, credit_balance: customer.credit_balance } });
});

router.get('/:id', auth, async (req, res) => {
  const { Customer } = req.models;
  const c = await Customer.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

router.put('/:id', auth, async (req, res) => {
  const { Customer } = req.models;
  try {
    const c = await Customer.findByPk(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    await c.update(sanitise(req.body));
    res.json(c);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  const { Customer } = req.models;
  const c = await Customer.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await c.destroy();
  res.json({ message: 'Deleted' });
});

router.get('/:id/credit-history', auth, async (req, res) => {
  const { Customer, CreditPayment, User, Sale, Payment } = req.models;
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const payments = await CreditPayment.findAll({
    where: { customer_id: customer.id },
    include: [{ model: User, as: 'user', attributes: ['name'] }],
    order: [['created_at', 'DESC']],
  });

  const sales = await Sale.findAll({
    where: { customer_id: customer.id },
    include: [{ model: Payment, as: 'payments', where: { method: 'credit' }, required: true }],
    order: [['created_at', 'DESC']],
  });

  res.json({
    customer: {
      id: customer.id, name: customer.name, phone: customer.phone,
      credit_limit: customer.credit_limit, credit_balance: customer.credit_balance,
    },
    payments: payments.map(p => ({
      id: p.id, invoice_no: p.invoice_no, amount: p.amount, note: p.note,
      created_at: p.created_at, recorded_by: p.user?.name || '—',
    })),
    sales: sales.map(s => ({
      id: s.id, invoice_no: s.invoice_no, total: s.total,
      credit_amount: s.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      created_at: s.created_at,
    })),
  });
});

router.post('/:id/settle-credit', auth, async (req, res) => {
  const { Customer, CreditPayment } = req.models;
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const amount = parseFloat(req.body.amount);
  if (!amount || amount <= 0) return res.status(422).json({ error: 'Invalid amount' });

  const d = new Date();
  const invoice_no = `REC-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-5)}`;
  await CreditPayment.create({ invoice_no, customer_id: customer.id, user_id: req.user.id, amount, note: req.body.note });
  const newBalance = Math.max(0, parseFloat(customer.credit_balance) - amount);
  await customer.update({ credit_balance: newBalance });
  res.json({ message: 'Credit settled', credit_balance: newBalance });
});

// POST /api/customers/:id/credit-adjustment — manual add or reduce credit balance
router.post('/:id/credit-adjustment', auth, async (req, res) => {
  const { Customer, CreditPayment } = req.models;
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const amount = parseFloat(req.body.amount);
  if (!amount || amount <= 0) return res.status(422).json({ error: 'Invalid amount' });

  const type = req.body.type === 'add' ? 'add' : 'reduce';
  const current = parseFloat(customer.credit_balance) || 0;
  const newBalance = type === 'add'
    ? current + amount
    : Math.max(0, current - amount);

  const d = new Date();
  const ref = `ADJ-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-5)}`;
  await CreditPayment.create({
    invoice_no: ref,
    customer_id: customer.id,
    user_id: req.user.id,
    amount: type === 'add' ? -amount : amount,
    note: req.body.note || `Manual ${type === 'add' ? 'credit added' : 'credit reduced'}`,
  });
  await customer.update({ credit_balance: newBalance });
  res.json({ message: 'Adjusted', credit_balance: newBalance });
});

module.exports = router;
