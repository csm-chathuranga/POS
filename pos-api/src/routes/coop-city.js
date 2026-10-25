const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');

async function requireModule(req, res, next) {
  const s = await req.models.Setting.findOne({ where: { key: 'module.coop_city.enabled' } });
  if (s?.value !== 'true') return res.status(403).json({ error: 'Coop City module is not enabled' });
  next();
}

router.use(auth, (req, res, next) => requireModule(req, res, next).catch(next));

async function nextTransferNo(models, t) {
  const prefix = 'ST-';
  const rows = await models.CoopStockTransfer.findAll({
    where: { transfer_no: { [Op.like]: `${prefix}%` } },
    attributes: ['transfer_no'], transaction: t,
  });
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.transfer_no.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

function transferWithItems(models, id) {
  return models.CoopStockTransfer.findByPk(id, {
    include: [
      { model: models.CoopStockTransferItem, as: 'items' },
      { model: models.CoopStore, as: 'fromStore', attributes: ['id', 'name'] },
      { model: models.CoopStore, as: 'toStore', attributes: ['id', 'name'] },
      { model: models.User, as: 'createdBy', attributes: ['id', 'name'] },
    ],
  });
}

// ── Stores ────────────────────────────────────────────────────────────────────
router.get('/stores', async (req, res) => {
  res.json(await req.models.CoopStore.findAll({ order: [['name', 'ASC']] }));
});

router.post('/stores', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(422).json({ error: 'Store name is required' });
  res.status(201).json(await req.models.CoopStore.create({ name }));
});

router.put('/stores/:id', async (req, res) => {
  const store = await req.models.CoopStore.findByPk(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const name = String(req.body.name ?? store.name).trim();
  if (!name) return res.status(422).json({ error: 'Store name is required' });
  await store.update({ name, active: req.body.active ?? store.active });
  res.json(store);
});

router.delete('/stores/:id', async (req, res) => {
  const { CoopStore, CoopStockTransfer } = req.models;
  const used = await CoopStockTransfer.count({
    where: { [Op.or]: [{ from_store_id: req.params.id }, { to_store_id: req.params.id }] },
  });
  if (used) return res.status(400).json({ error: 'Store is used in transfers; deactivate it instead' });
  await CoopStore.destroy({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── Stock transfers ───────────────────────────────────────────────────────────
router.get('/transfers', async (req, res) => {
  const { CoopStockTransfer, CoopStore } = req.models;
  res.json(await CoopStockTransfer.findAll({
    include: [
      { model: CoopStore, as: 'fromStore', attributes: ['id', 'name'] },
      { model: CoopStore, as: 'toStore', attributes: ['id', 'name'] },
    ],
    order: [['id', 'DESC']],
  }));
});

router.get('/transfers/:id', async (req, res) => {
  const tr = await transferWithItems(req.models, req.params.id);
  if (!tr) return res.status(404).json({ error: 'Transfer not found' });
  res.json(tr);
});

router.post('/transfers', async (req, res) => {
  const { Product, StockMovement, CoopStockTransfer, CoopStockTransferItem } = req.models;
  const { items = [], from_store_id, to_store_id, date, remarks, prepared_by, checked_by, issued_by, received_by } = req.body;

  if (!from_store_id || !to_store_id) return res.status(422).json({ error: 'Select both stores' });
  if (String(from_store_id) === String(to_store_id)) return res.status(422).json({ error: 'From and To stores must differ' });
  if (!items.length) return res.status(422).json({ error: 'Add at least one item' });

  const t = await req.db.transaction();
  try {
    const transfer_no = await nextTransferNo(req.models, t);
    const transfer = await CoopStockTransfer.create({
      transfer_no, date: date || new Date().toISOString().slice(0, 10),
      from_store_id, to_store_id, remarks, prepared_by, checked_by, issued_by, received_by,
      created_by: req.user.id,
    }, { transaction: t });

    let totalCost = 0, totalSelling = 0;
    for (const it of items) {
      const qty = parseFloat(it.qty) || 0;
      if (qty <= 0) throw Object.assign(new Error('Quantity must be greater than zero'), { status: 422 });
      const product = await Product.findByPk(it.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) throw Object.assign(new Error('Product not found'), { status: 422 });
      const before = parseFloat(product.stock_qty) || 0;
      if (before < qty) throw Object.assign(new Error(`Insufficient stock for ${product.name} (available ${before})`), { status: 400 });

      const cost = parseFloat(it.cost_price ?? product.cost_price) || 0;
      const sell = parseFloat(it.selling_price ?? product.selling_price) || 0;
      const costTotal = +(qty * cost).toFixed(2);
      const sellTotal = +(qty * sell).toFixed(2);
      totalCost += costTotal;
      totalSelling += sellTotal;

      await CoopStockTransferItem.create({
        transfer_id: transfer.id, product_id: product.id, product_name: product.name,
        qty, cost_price: cost, selling_price: sell, cost_total: costTotal, selling_total: sellTotal,
      }, { transaction: t });

      await product.update({ stock_qty: before - qty }, { transaction: t });
      await StockMovement.create({
        product_id: product.id, user_id: req.user.id, type: 'out', qty,
        stock_before: before, stock_after: before - qty,
        reference: transfer_no, note: 'Coop City stock transfer',
      }, { transaction: t });
    }

    await transfer.update({ total_cost: totalCost, total_selling: totalSelling }, { transaction: t });
    await t.commit();
    res.status(201).json(await transferWithItems(req.models, transfer.id));
  } catch (e) {
    await t.rollback();
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

// Deleting a transfer returns the stock
router.delete('/transfers/:id', async (req, res) => {
  const { Product, StockMovement, CoopStockTransfer, CoopStockTransferItem } = req.models;
  const transfer = await CoopStockTransfer.findByPk(req.params.id);
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

  const t = await req.db.transaction();
  try {
    const items = await CoopStockTransferItem.findAll({ where: { transfer_id: transfer.id }, transaction: t });
    for (const it of items) {
      const product = await Product.findByPk(it.product_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) continue;
      const before = parseFloat(product.stock_qty) || 0;
      const after = before + parseFloat(it.qty);
      await product.update({ stock_qty: after }, { transaction: t });
      await StockMovement.create({
        product_id: product.id, user_id: req.user.id, type: 'return', qty: it.qty,
        stock_before: before, stock_after: after,
        reference: transfer.transfer_no, note: 'Coop City transfer deleted',
      }, { transaction: t });
    }
    await CoopStockTransferItem.destroy({ where: { transfer_id: transfer.id }, transaction: t });
    await transfer.destroy({ transaction: t });
    await t.commit();
    res.json({ ok: true });
  } catch (e) {
    await t.rollback();
    throw e;
  }
});

module.exports = router;
