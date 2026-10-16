const router = require('express').Router();
const { Op }  = require('sequelize');
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { postPurchase, postPurchaseReturn } = require('../helpers/accounting');

router.get('/', auth, async (req, res) => {
  const { Purchase, PurchaseReturn, Supplier, User } = req.models;
  const page   = parseInt(req.query.page || '1');
  const limit  = 20;
  const search = (req.query.search || '').trim();

  const where = search
    ? { [Op.or]: [
        { grn_no: { [Op.like]: `%${search}%` } },
        { '$supplier.name$': { [Op.like]: `%${search}%` } },
      ] }
    : {};

  const { count, rows } = await Purchase.findAndCountAll({
    where,
    include: [
      { model: Supplier,       as: 'supplier', attributes: ['id', 'name'] },
      { model: User,           as: 'user',     attributes: ['id', 'name'] },
      { model: PurchaseReturn, as: 'returns',  attributes: ['id'] },
    ],
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    subQuery: false,
  });
  res.json({ data: rows, total: count, page, last_page: Math.ceil(count / limit) });
});

router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  const { Purchase, PurchaseItem, Product, StockMovement, Supplier } = req.models;
  const { items = [], ...data } = req.body;

  if (!data.supplier_id) return res.status(422).json({ error: 'Please select a supplier' });
  if (!items.length)     return res.status(422).json({ error: 'Please add at least one item' });

  const totalAmt = parseFloat(data.total) || 0;
  data.paid      = Math.min(parseFloat(data.paid) || 0, totalAmt);
  data.status    = data.paid >= totalAmt - 0.005 ? 'received' : data.paid > 0 ? 'partial' : 'pending';
  if (!data.supplier_id) data.supplier_id = null;
  if (!data.due_date)    data.due_date    = null;

  const lastGrn = await Purchase.findOne({ order: [['id', 'DESC']], attributes: ['grn_no'] });
  const grnNum  = parseInt(lastGrn?.grn_no?.split('-').pop() || '0') + 1;
  const grn_no  = `GRN-${String(grnNum).padStart(4, '0')}`;

  const purchase = await Purchase.create({ ...data, grn_no, user_id: req.user.id });

  for (const item of items) {
    const itemTotal = (parseFloat(item.cost_price) || 0) * (parseFloat(item.qty) || 0);
    await PurchaseItem.create({ ...item, purchase_id: purchase.id, total: itemTotal });
    const product = await Product.findByPk(item.product_id);
    if (product) {
      const before = parseFloat(product.stock_qty);
      const after  = before + parseFloat(item.qty);
      const updates = { stock_qty: after, cost_price: item.cost_price };
      if (item.selling_price) updates.selling_price = item.selling_price;
      await product.update(updates);
      await StockMovement.create({
        product_id: product.id, user_id: req.user.id, type: 'in',
        qty: item.qty, stock_before: before, stock_after: after, reference: grn_no,
      });
    }
  }

  // Update supplier payable balance with the unpaid portion
  if (data.supplier_id) {
    const supplier = await Supplier.findByPk(data.supplier_id);
    if (supplier) {
      const unpaid = totalAmt - data.paid; // totalAmt and data.paid already clamped above
      if (unpaid > 0.005) {
        await supplier.update({ payable_balance: parseFloat(supplier.payable_balance || 0) + unpaid });
      }
    }
  }

  // Post to accounting journal (no-op if module disabled or accounts not seeded)
  postPurchase(req.models, { purchase, total: totalAmt, paid: data.paid, user_id: req.user.id });

  res.status(201).json(purchase);
});

router.get('/:id', auth, async (req, res) => {
  const { Purchase, PurchaseItem, Supplier, User } = req.models;
  const purchase = await Purchase.findByPk(req.params.id, {
    include: [
      { model: PurchaseItem, as: 'items' },
      { model: Supplier,     as: 'supplier', attributes: ['id', 'name'] },
      { model: User,         as: 'user',     attributes: ['id', 'name'] },
    ],
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  res.json(purchase);
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Purchase, PurchaseItem, Product, StockMovement, Supplier } = req.models;
  const p = await Purchase.findByPk(req.params.id, {
    include: [{ model: PurchaseItem, as: 'items' }],
  });
  if (!p) return res.status(404).json({ error: 'Not found' });

  for (const item of p.items) {
    const product = await Product.findByPk(item.product_id);
    if (product) {
      const before = parseFloat(product.stock_qty);
      const after  = Math.max(0, before - parseFloat(item.qty));
      await product.update({ stock_qty: after });
      await StockMovement.create({
        product_id:   product.id,
        user_id:      req.user.id,
        type:         'out',
        qty:          item.qty,
        stock_before: before,
        stock_after:  after,
        reference:    `DEL-${p.grn_no}`,
      });
    }
  }

  // Reverse the unpaid portion from supplier payable balance
  if (p.supplier_id) {
    const unpaid = Math.max(0, parseFloat(p.total) - parseFloat(p.paid));
    if (unpaid > 0) {
      const supplier = await Supplier.findByPk(p.supplier_id);
      if (supplier) {
        const newBalance = Math.max(0, parseFloat(supplier.payable_balance) - unpaid);
        await supplier.update({ payable_balance: newBalance });
      }
    }
  }

  await p.destroy();
  res.json({ message: 'Deleted' });
});

router.post('/:id/return', auth, role('admin', 'manager'), async (req, res) => {
  const { Purchase, PurchaseItem, PurchaseReturn, Product, StockMovement, Supplier } = req.models;
  const purchase = await Purchase.findByPk(req.params.id, {
    include: [{ model: PurchaseItem, as: 'items' }],
  });
  if (!purchase) return res.status(404).json({ error: 'Not found' });

  const { items = [], reason, total } = req.body;
  const return_no = `PRN-${Date.now()}`;

  const ret = await PurchaseReturn.create({
    purchase_id: purchase.id,
    user_id:     req.user.id,
    return_no,
    reason,
    total,
    items,
  });

  // Reduce stock and update purchase item qty for each returned item
  for (const item of items) {
    // Update the purchase item qty
    const purchaseItem = purchase.items.find(pi => pi.product_id == item.product_id);
    if (purchaseItem) {
      const newQty = Math.max(0, parseFloat(purchaseItem.qty) - parseFloat(item.qty));
      const newItemTotal = newQty * parseFloat(purchaseItem.cost_price);
      await purchaseItem.update({ qty: newQty, total: newItemTotal });
    }

    const product = await Product.findByPk(item.product_id);
    if (product) {
      const before = parseFloat(product.stock_qty);
      const after  = Math.max(0, before - parseFloat(item.qty));
      await product.update({ stock_qty: after });
      await StockMovement.create({
        product_id:   product.id,
        user_id:      req.user.id,
        type:         'return',
        qty:          item.qty,
        stock_before: before,
        stock_after:  after,
        reference:    return_no,
      });
    }
  }

  // Reduce purchase total; recalculate paid and status
  const returnTotal  = parseFloat(total || 0);
  const unpaidBefore = Math.max(0, parseFloat(purchase.total) - parseFloat(purchase.paid));
  const newTotal     = Math.max(0, parseFloat(purchase.total) - returnTotal);
  const newPaid      = Math.min(parseFloat(purchase.paid), newTotal);
  const newUnpaid    = Math.max(0, newTotal - newPaid);
  const newStatus    = newUnpaid <= 0.005 ? 'received' : newPaid > 0 ? 'partial' : 'pending';

  await purchase.update({ total: newTotal, paid: newPaid, status: newStatus });

  // Reduce stored supplier payable balance by the reduction in unpaid amount
  if (purchase.supplier_id) {
    const balanceReduction = unpaidBefore - newUnpaid;
    if (balanceReduction > 0.005) {
      const supplier = await Supplier.findByPk(purchase.supplier_id);
      if (supplier) {
        const newBalance = Math.max(0, parseFloat(supplier.payable_balance || 0) - balanceReduction);
        await supplier.update({ payable_balance: newBalance });
      }
    }
  }

  // Post to accounting journal (no-op if module disabled or accounts not seeded)
  postPurchaseReturn(req.models, { return_no, total: returnTotal, user_id: req.user.id });

  res.status(201).json(ret);
});

router.get('/:id/returns', auth, async (req, res) => {
  const { PurchaseReturn } = req.models;
  const returns = await PurchaseReturn.findAll({
    where: { purchase_id: req.params.id },
    order: [['id', 'DESC']],
  });
  res.json(returns);
});

module.exports = router;
