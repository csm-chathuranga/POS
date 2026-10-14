const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { postSupplierPayment } = require('../helpers/accounting');

router.get('/', auth, async (req, res) => {
  const { Supplier, Purchase } = req.models;
  const suppliers = await Supplier.findAll({ order: [['name', 'ASC']] });

  // Compute outstanding from actual purchase records (avoids stale payable_balance)
  const unpaidRows = await Purchase.findAll({
    attributes: [
      'supplier_id',
      [Purchase.sequelize.fn('SUM', Purchase.sequelize.literal('`total` - `paid`')), 'outstanding'],
    ],
    where: { status: ['pending', 'partial'] },
    group: ['supplier_id'],
    raw: true,
  });

  const outstandingMap = {};
  for (const r of unpaidRows) {
    if (r.supplier_id) outstandingMap[r.supplier_id] = Math.max(0, parseFloat(r.outstanding) || 0);
  }

  res.json(suppliers.map(s => ({
    ...s.toJSON(),
    payable_balance: outstandingMap[s.id] || 0,
  })));
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

  const [payments, purchases] = await Promise.all([
    SupplierPayment.findAll({
      where: { supplier_id: supplier.id },
      include: [{ model: User, as: 'user', attributes: ['name'] }],
      order: [['created_at', 'DESC']],
    }),
    Purchase.findAll({
      where: { supplier_id: supplier.id },
      order: [['id', 'DESC']],
    }),
  ]);

  // Compute real outstanding from purchases rather than trusting the denormalized field
  const realOutstanding = purchases.reduce((sum, p) => {
    if (p.status === 'pending' || p.status === 'partial') {
      return sum + Math.max(0, parseFloat(p.total) - parseFloat(p.paid));
    }
    return sum;
  }, 0);

  // Keep DB field in sync
  if (Math.abs(realOutstanding - parseFloat(supplier.payable_balance)) > 0.01) {
    await supplier.update({ payable_balance: realOutstanding });
  }

  res.json({
    supplier: {
      id: supplier.id, name: supplier.name, phone: supplier.phone,
      payable_balance: realOutstanding,
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

router.post('/:id/settle-credit', auth, role('admin', 'manager'), async (req, res) => {
  const { Supplier, SupplierPayment, Purchase } = req.models;
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Not found' });

  const amount = parseFloat(req.body.amount);
  if (!amount || amount <= 0) return res.status(422).json({ error: 'Invalid amount' });

  // Compute real outstanding from actual purchases (avoids stale payable_balance)
  const unpaidGRNs = await Purchase.findAll({
    where: { supplier_id: supplier.id, status: ['pending', 'partial'] },
    order: [['id', 'ASC']],
  });
  const realOutstanding = unpaidGRNs.reduce((sum, p) =>
    sum + Math.max(0, parseFloat(p.total) - parseFloat(p.paid)), 0);

  if (amount > realOutstanding + 0.005) {
    return res.status(422).json({ error: `Amount exceeds outstanding balance of ${realOutstanding.toFixed(2)}` });
  }

  // Record the payment entry
  const d = new Date();
  const ref_no = `PAY-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-5)}`;
  await SupplierPayment.create({ ref_no, supplier_id: supplier.id, user_id: req.user.id, amount, note: req.body.note });

  // Allocate payment to oldest unpaid GRNs first (FIFO) — reuses unpaidGRNs fetched above
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

  // Update supplier payable balance (sync from real outstanding)
  const newBalance = Math.max(0, realOutstanding - amount);
  await supplier.update({ payable_balance: newBalance });

  // Post to accounting journal (no-op if module disabled or accounts not seeded)
  postSupplierPayment(req.models, { ref_no, amount, user_id: req.user.id });

  res.json({ message: 'Payment recorded', payable_balance: newBalance });
});

module.exports = router;
