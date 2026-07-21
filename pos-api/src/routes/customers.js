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

router.post('/', auth, async (req, res) => {
  const { Customer } = req.models;
  res.status(201).json(await Customer.create(req.body));
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
  const c = await Customer.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await c.update(req.body);
  res.json(c);
});

router.delete('/:id', auth, async (req, res) => {
  const { Customer } = req.models;
  const c = await Customer.findByPk(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await c.destroy();
  res.json({ message: 'Deleted' });
});

router.post('/:id/settle-credit', auth, async (req, res) => {
  const { Customer, CreditPayment } = req.models;
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const amount = parseFloat(req.body.amount);
  if (!amount || amount <= 0) return res.status(422).json({ error: 'Invalid amount' });

  await CreditPayment.create({ customer_id: customer.id, user_id: req.user.id, amount, note: req.body.note });
  const newBalance = Math.max(0, parseFloat(customer.credit_balance) - amount);
  await customer.update({ credit_balance: newBalance });
  res.json({ message: 'Credit settled', credit_balance: newBalance });
});

module.exports = router;
