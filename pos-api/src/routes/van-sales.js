const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

async function requireModule(req, res, next) {
  const s = await req.models.Setting.findOne({ where: { key: 'module.van_sales.enabled' } });
  if (s?.value !== 'true') return res.status(403).json({ error: 'Van Sales module is not enabled' });
  next();
}

// Run any pending column migrations once per process per tenant
const migratedTenants = new Set();
router.use(auth, async (req, res, next) => {
  const tenant = req.tenant || '_default';
  if (!migratedTenants.has(tenant)) {
    migratedTenants.add(tenant);
    try { await require('../lib/vanSales').ensureVanSalesTables(req.db); } catch {}
  }
  next();
});

router.use(auth, (req, res, next) => requireModule(req, res, next).catch(next));

// ── Stock helpers ─────────────────────────────────────────────────────────────

async function deductStock(models, items, userId, reference) {
  const { Product, StockMovement } = models;
  for (const item of items) {
    if (!item.variant_name || !item.quantity) continue;
    const product = await Product.findOne({ where: { name: item.variant_name } });
    if (!product) continue;
    const before = parseFloat(product.stock_qty);
    const after  = Math.max(0, before - parseFloat(item.quantity));
    await product.update({ stock_qty: after });
    await StockMovement.create({
      product_id: product.id,
      user_id:    userId,
      type:       'out',
      qty:        parseFloat(item.quantity),
      stock_before: before,
      stock_after:  after,
      reference,
      note: 'Van load',
    });
  }
}

async function returnStock(models, items, userId, reference) {
  const { Product, StockMovement } = models;
  for (const item of items) {
    const qty = parseFloat(item.qty_returned);
    if (!item.variant_name || !qty) continue;
    const product = await Product.findOne({ where: { name: item.variant_name } });
    if (!product) continue;
    const before = parseFloat(product.stock_qty);
    const after  = before + qty;
    await product.update({ stock_qty: after });
    await StockMovement.create({
      product_id: product.id,
      user_id:    userId,
      type:       'return',
      qty,
      stock_before: before,
      stock_after:  after,
      reference,
      note: 'Van unload — returned stock',
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSettlement(trip) {
  const loadMap = {};
  for (const load of trip.loads || []) {
    for (const item of load.items || []) {
      const k = item.variant_name;
      if (!loadMap[k]) loadMap[k] = { loaded: 0, unit_price: Number(item.unit_price) };
      loadMap[k].loaded += item.quantity;
    }
  }
  const returnMap  = {};
  const damageMap  = {};
  for (const u of trip.unload_items || []) {
    returnMap[u.variant_name] = (returnMap[u.variant_name] || 0) + u.qty_returned;
    damageMap[u.variant_name] = (damageMap[u.variant_name] || 0) + (u.qty_damaged || 0);
  }
  const variants = Object.entries(loadMap).map(([name, d]) => {
    const returned = returnMap[name] || 0;
    const damaged  = damageMap[name] || 0;
    const sold     = Math.max(0, d.loaded - returned - damaged);
    return { name, loaded: d.loaded, returned, damaged, sold, unit_price: d.unit_price, sales_value: sold * d.unit_price };
  });
  const gross_sales    = variants.reduce((s, v) => s + v.sales_value, 0);
  const total_advances = (trip.daily_records || []).reduce((s, r) => s + Number(r.advance_given), 0);
  const total_cash     = (trip.daily_records || []).reduce((s, r) => s + Number(r.cash_handover), 0);
  return { variants, gross_sales, total_advances, total_cash, balance: gross_sales - total_advances - total_cash };
}

async function loadTrip(models, id) {
  const { VanTrip, VanLoad, VanLoadItem, VanDailyRecord, VanUnloadItem } = models;
  const trip = await VanTrip.findByPk(id, { raw: false });
  if (!trip) return null;
  const t = trip.toJSON();
  const loads = await VanLoad.findAll({ where: { trip_id: id }, order: [['date', 'ASC']], raw: true });
  for (const load of loads) {
    load.items = await VanLoadItem.findAll({ where: { load_id: load.id }, raw: true });
  }
  t.loads          = loads;
  t.daily_records  = await VanDailyRecord.findAll({ where: { trip_id: id }, order: [['date', 'ASC']], raw: true });
  t.unload_items   = await VanUnloadItem.findAll({ where: { trip_id: id }, raw: true });
  return t;
}

// ── GET /api/van-sales ─────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { VanTrip, VanDailyRecord } = req.models;
  const trips = await VanTrip.findAll({ order: [['id', 'DESC']], raw: true });
  const ids = trips.map(t => t.id);
  let dailyMap = {};
  if (ids.length) {
    const records = await VanDailyRecord.findAll({ where: { trip_id: ids }, raw: true });
    for (const r of records) {
      if (!dailyMap[r.trip_id]) dailyMap[r.trip_id] = { days: 0, total_advance: 0, total_cash: 0 };
      dailyMap[r.trip_id].days++;
      dailyMap[r.trip_id].total_advance += Number(r.advance_given);
      dailyMap[r.trip_id].total_cash    += Number(r.cash_handover);
    }
  }
  res.json(trips.map(t => ({ ...t, summary: dailyMap[t.id] || { days: 0, total_advance: 0, total_cash: 0 } })));
});

// ── POST /api/van-sales ────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { driver_name, vehicle_no, start_date, notes, items } = req.body;
  if (!driver_name || !start_date) return res.status(422).json({ error: 'driver_name and start_date are required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(422).json({ error: 'At least one item is required for the initial load' });

  const { VanTrip, VanLoad, VanLoadItem } = req.models;
  const trip = await VanTrip.create({ driver_name, vehicle_no: vehicle_no || '', start_date, notes: notes || '', status: 'active' });
  const load = await VanLoad.create({ trip_id: trip.id, date: start_date, type: 'initial' });
  const loadedItems = items.map(i => ({
    load_id: load.id,
    variant_name: i.variant_name,
    quantity: Number(i.quantity) || 0,
    unit_price: Number(i.unit_price) || 0,
    unit_cost: Number(i.unit_cost) || 0,
  }));
  await VanLoadItem.bulkCreate(loadedItems);
  await deductStock(req.models, loadedItems, req.user?.id, `VAN-${trip.id}`);
  res.status(201).json(await loadTrip(req.models, trip.id));
});

// ── GET /api/van-sales/:id ────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const trip = await loadTrip(req.models, req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

// ── POST /api/van-sales/:id/daily ─────────────────────────────────────────────

router.post('/:id/daily', async (req, res) => {
  const { VanTrip, VanDailyRecord } = req.models;
  const trip = await VanTrip.findByPk(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status === 'closed') return res.status(400).json({ error: 'Trip is closed' });

  const { date, advance_given, cash_handover, notes } = req.body;
  if (!date) return res.status(422).json({ error: 'date is required' });

  const [record] = await VanDailyRecord.upsert({
    trip_id: trip.id,
    date,
    advance_given: advance_given !== undefined ? Number(advance_given) : 5000,
    cash_handover: Number(cash_handover) || 0,
    notes: notes || '',
  });
  res.json(record);
});

// ── POST /api/van-sales/:id/refill ────────────────────────────────────────────

router.post('/:id/refill', async (req, res) => {
  const { VanTrip, VanLoad, VanLoadItem } = req.models;
  const trip = await VanTrip.findByPk(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status === 'closed') return res.status(400).json({ error: 'Trip is closed' });

  const { date, items, notes } = req.body;
  if (!date) return res.status(422).json({ error: 'date is required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(422).json({ error: 'At least one item is required' });

  const load = await VanLoad.create({ trip_id: trip.id, date, type: 'refill', notes: notes || '' });
  const refillItems = items.map(i => ({
    load_id: load.id,
    variant_name: i.variant_name,
    quantity: Number(i.quantity) || 0,
    unit_price: Number(i.unit_price) || 0,
    unit_cost: Number(i.unit_cost) || 0,
  }));
  await VanLoadItem.bulkCreate(refillItems);
  await deductStock(req.models, refillItems, req.user?.id, `VAN-${trip.id}`);
  res.json(await loadTrip(req.models, trip.id));
});

// ── POST /api/van-sales/:id/unload ────────────────────────────────────────────

router.post('/:id/unload', async (req, res) => {
  const { VanTrip, VanUnloadItem } = req.models;
  const trip = await VanTrip.findByPk(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status === 'closed') return res.status(400).json({ error: 'Trip is already closed' });

  const { date, items } = req.body;
  if (!date) return res.status(422).json({ error: 'date is required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(422).json({ error: 'At least one unload item is required' });

  await VanUnloadItem.destroy({ where: { trip_id: trip.id } });
  const unloadItems = items.map(i => ({
    trip_id:      trip.id,
    date,
    variant_name: i.variant_name,
    qty_returned: Number(i.qty_returned) || 0,
    qty_damaged:  Number(i.qty_damaged)  || 0,
  }));
  await VanUnloadItem.bulkCreate(unloadItems);
  await returnStock(req.models, unloadItems, req.user?.id, `VAN-${trip.id}`);
  await trip.update({ status: 'closed', end_date: date });
  res.json(await loadTrip(req.models, trip.id));
});

// ── GET /api/van-sales/:id/settlement ─────────────────────────────────────────

router.get('/:id/settlement', async (req, res) => {
  const trip = await loadTrip(req.models, req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'closed') return res.status(400).json({ error: 'Trip must be unloaded before settlement' });
  res.json(buildSettlement(trip));
});

// ── DELETE /api/van-sales/:id ─────────────────────────────────────────────────

router.delete('/:id', role('admin'), async (req, res) => {
  const { VanTrip, VanLoad, VanLoadItem, VanDailyRecord, VanUnloadItem } = req.models;
  const trip = await VanTrip.findByPk(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status === 'closed') return res.status(400).json({ error: 'Cannot delete a closed trip' });

  const dailyCount = await VanDailyRecord.count({ where: { trip_id: trip.id } });
  if (dailyCount > 0) return res.status(400).json({ error: 'Cannot delete a trip with daily records' });

  const loads = await VanLoad.findAll({ where: { trip_id: trip.id }, raw: true });
  for (const l of loads) await VanLoadItem.destroy({ where: { load_id: l.id } });
  await VanLoad.destroy({ where: { trip_id: trip.id } });
  await VanUnloadItem.destroy({ where: { trip_id: trip.id } });
  await trip.destroy();
  res.json({ ok: true });
});

module.exports = router;
