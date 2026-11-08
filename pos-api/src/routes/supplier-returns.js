const router = require('express').Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  const { SupplierReturn, SupplierReturnItem, Supplier, User } = req.models;
  const page   = parseInt(req.query.page || '1');
  const limit  = 20;
  const search = (req.query.search || '').trim();

  const where = search
    ? { [Op.or]: [
        { srn_no: { [Op.like]: `%${search}%` } },
        { '$supplier.name$': { [Op.like]: `%${search}%` } },
      ]}
    : {};

  const { count, rows } = await SupplierReturn.findAndCountAll({
    where,
    include: [
      { model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
      { model: User,     as: 'user',     attributes: ['id', 'name'] },
    ],
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    subQuery: false,
  });
  res.json({ data: rows, total: count, page, last_page: Math.ceil(count / limit) });
});

router.post('/', auth, role('admin', 'manager', 'custom'), async (req, res) => {
  const { SupplierReturn, SupplierReturnItem, Product, StockMovement } = req.models;
  const { items = [], supplier_id, return_type = 'other', notes } = req.body;

  if (!items.length) return res.status(422).json({ error: 'Please add at least one item' });

  const last   = await SupplierReturn.findOne({ order: [['id', 'DESC']], attributes: ['srn_no'] });
  const srnNum = parseInt(last?.srn_no?.split('-').pop() || '0') + 1;
  const srn_no = `SRN-${String(srnNum).padStart(4, '0')}`;

  const total = items.reduce((s, i) => s + (parseFloat(i.cost_price) || 0) * (parseFloat(i.qty) || 0), 0);

  const t = await req.db.transaction();
  try {
    const ret = await SupplierReturn.create({
      srn_no,
      supplier_id: supplier_id || null,
      user_id:     req.user.id,
      return_type,
      notes:       notes || null,
      total,
    }, { transaction: t });

    for (const item of items) {
      const qty       = parseFloat(item.qty)        || 0;
      const costPrice = parseFloat(item.cost_price) || 0;

      await SupplierReturnItem.create({
        supplier_return_id: ret.id,
        product_id:         item.product_id,
        product_name:       item.product_name,
        qty,
        cost_price: costPrice,
        total:      qty * costPrice,
      }, { transaction: t });

      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (product) {
        const before = parseFloat(product.stock_qty);
        const after  = Math.max(0, before - qty);
        await product.update({ stock_qty: after }, { transaction: t });
        await StockMovement.create({
          product_id:   product.id,
          user_id:      req.user.id,
          type:         'return',
          qty,
          stock_before: before,
          stock_after:  after,
          reference:    srn_no,
        }, { transaction: t });
      }
    }

    await t.commit();
    res.status(201).json(ret);
  } catch (e) {
    await t.rollback();
    console.error('[supplier-returns] create failed:', e.message);
    res.status(500).json({ error: 'Failed to create supplier return' });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { SupplierReturn, SupplierReturnItem, Supplier, User, Product } = req.models;
  const ret = await SupplierReturn.findByPk(req.params.id, {
    include: [
      { model: SupplierReturnItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }] },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name'], required: false },
      { model: User,     as: 'user',     attributes: ['id', 'name'] },
    ],
  });
  if (!ret) return res.status(404).json({ error: 'Not found' });
  res.json(ret);
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { SupplierReturn, SupplierReturnItem, Product, StockMovement } = req.models;
  const ret = await SupplierReturn.findByPk(req.params.id, {
    include: [{ model: SupplierReturnItem, as: 'items' }],
  });
  if (!ret) return res.status(404).json({ error: 'Not found' });

  const t = await req.db.transaction();
  try {
    for (const item of ret.items) {
      const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (product) {
        const before = parseFloat(product.stock_qty);
        const after  = before + parseFloat(item.qty);
        await product.update({ stock_qty: after }, { transaction: t });
        await StockMovement.create({
          product_id:   product.id,
          user_id:      req.user.id,
          type:         'in',
          qty:          item.qty,
          stock_before: before,
          stock_after:  after,
          reference:    `VOID-${ret.srn_no}`,
        }, { transaction: t });
      }
    }
    await SupplierReturnItem.destroy({ where: { supplier_return_id: ret.id }, transaction: t });
    await ret.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Deleted' });
  } catch (e) {
    await t.rollback();
    console.error('[supplier-returns] delete failed:', e.message);
    res.status(500).json({ error: 'Failed to delete supplier return' });
  }
});

module.exports = router;
