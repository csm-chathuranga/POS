const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  const { Supplier } = req.models;
  res.json(await Supplier.findAll({ order: [['name', 'ASC']] }));
});

router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  const { Supplier } = req.models;
  res.status(201).json(await Supplier.create(req.body));
});

router.get('/:id', auth, async (req, res) => {
  const { Supplier } = req.models;
  const s = await Supplier.findByPk(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

router.put('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Supplier } = req.models;
  const s = await Supplier.findByPk(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  await s.update(req.body);
  res.json(s);
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Supplier } = req.models;
  const s = await Supplier.findByPk(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  await s.destroy();
  res.json({ message: 'Deleted' });
});

router.get('/:id/credit-history', auth, async (req, res) => {
  const { Supplier, SupplierPayment, Purchase, User } = req.models;
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Not found' });

  const payments = await SupplierPayment.findAll({
    where: { supplier_id: supplier.id },
    include: [{ model: User, as: 'user', attributes: ['name'] }],
    order: [['created_at', 'DESC']],
  });

  const purchases = await Purchase.findAll({
    where: { supplier_id: supplier.id },
    order: [['id', 'DESC']],
  });

  res.json({
    supplier: {
      id: supplier.id, name: supplier.name, phone: supplier.phone,
      payable_balance: supplier.payable_balance,
    },
    payments: payments.map(p => ({
      id: p.id, ref_no: p.ref_no, amount: p.amount, note: p.note,
      created_at: p.created_at, recorded_by: p.user?.name || '—',
    })),
    purchases: purchases.map(p => ({
      id: p.id, grn_no: p.grn_no, total: p.total, paid: p.paid,
      unpaid: Math.max(0, parseFloat(p.total) - parseFloat(p.paid)),
      status: p.status, purchase_date: p.purchase_date,
    })),
  });
});

router.post('/:id/settle-credit', auth, async (req, res) => {
  const { Supplier, SupplierPayment, Purchase } = req.models;
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Not found' });

  const amount = parseFloat(req.body.amount);
  if (!amount || amount <= 0) return res.status(422).json({ error: 'Invalid amount' });

  // Record the payment entry
  const d = new Date();
  const ref_no = `PAY-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-5)}`;
  await SupplierPayment.create({ ref_no, supplier_id: supplier.id, user_id: req.user.id, amount, note: req.body.note });

  // Allocate payment to oldest unpaid GRNs first (FIFO)
  const unpaidGRNs = await Purchase.findAll({
    where: { supplier_id: supplier.id, status: ['pending', 'partial'] },
    order: [['id', 'ASC']],
  });

  let remaining = amount;
  for (const grn of unpaidGRNs) {
    if (remaining <= 0) break;
    const unpaid = parseFloat(grn.total) - parseFloat(grn.paid);
    if (unpaid <= 0) continue;

    const applying = Math.min(remaining, unpaid);
    const newPaid  = parseFloat(grn.paid) + applying;
    const newStatus = newPaid >= parseFloat(grn.total) - 0.005 ? 'received' : 'partial';
    await grn.update({ paid: newPaid, status: newStatus });
    remaining -= applying;
  }

  // Update supplier payable balance
  const newBalance = Math.max(0, parseFloat(supplier.payable_balance) - amount);
  await supplier.update({ payable_balance: newBalance });

  res.json({ message: 'Payment recorded', payable_balance: newBalance });
});

module.exports = router;
