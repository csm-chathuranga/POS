const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');

// ── helpers ──────────────────────────────────────────────────────────────────

async function nextSheetNo(models) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `LS-${today}-`;
  const count = await models.LoadingSheet.count({ where: { sheet_no: { [Op.like]: `${prefix}%` } } });
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}

async function sheetWithItems(models, id) {
  const sheet = await models.LoadingSheet.findByPk(id, {
    include: [
      {
        model: models.LoadingSheetItem,
        as: 'items',
        include: [
          {
            model: models.Sale,
            as: 'sale',
            include: [
              { model: models.Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'address'] },
              { model: models.SaleItem, as: 'items', attributes: ['id', 'product_name', 'qty', 'unit_price', 'discount', 'total'] },
            ],
            attributes: ['id', 'invoice_no', 'total', 'paid', 'status', 'created_at'],
          },
        ],
      },
      { model: models.User, as: 'createdBy', attributes: ['id', 'name'] },
    ],
  });
  return sheet;
}

// ── GET /available-sales?date= — sales not on any sheet ───────────────────────
router.get('/available-sales', auth, async (req, res) => {
  const { Sale, Customer, LoadingSheetItem } = req.models;
  const date = (req.query.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');

  // Get all sale IDs already on any loading sheet (open or delivered)
  const usedItems = await LoadingSheetItem.findAll({ attributes: ['sale_id'], raw: true });
  const usedIds = usedItems.map(r => r.sale_id);

  const where = {
    created_at: {
      [Op.gte]: new Date(`${date}T00:00:00`),
      [Op.lt]:  new Date(`${date}T23:59:59`),
    },
  };
  if (usedIds.length) where.id = { [Op.notIn]: usedIds };

  const sales = await Sale.findAll({
    where,
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'address'] }],
    attributes: ['id', 'invoice_no', 'total', 'status', 'created_at'],
    order: [['created_at', 'ASC']],
  });
  res.json(sales);
});

// ── GET / — list all sheets ───────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const { LoadingSheet, LoadingSheetItem, User } = req.models;
  const sheets = await LoadingSheet.findAll({
    include: [
      { model: LoadingSheetItem, as: 'items', attributes: ['id'] },
      { model: User, as: 'createdBy', attributes: ['id', 'name'] },
    ],
    order: [['date', 'DESC'], ['id', 'DESC']],
  });
  res.json(sheets.map(s => ({
    ...s.toJSON(),
    item_count: s.items?.length || 0,
  })));
});

// ── POST / — create sheet with optional sale_ids ──────────────────────────────
router.post('/', auth, async (req, res) => {
  const { date, note, sale_ids = [] } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const sheet_no = await nextSheetNo(req.models);
  const sheet = await req.models.LoadingSheet.create({
    sheet_no, date, note: note || null, created_by: req.user.id,
  });

  if (sale_ids.length) {
    await req.models.LoadingSheetItem.bulkCreate(
      sale_ids.map(sale_id => ({ sheet_id: sheet.id, sale_id })),
      { ignoreDuplicates: true }
    );
  }

  res.status(201).json(sheet);
});

// ── GET /:id — sheet detail ───────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  const sheet = await sheetWithItems(req.models, req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  res.json(sheet);
});

// ── POST /:id/add-sale — add a sale by invoice_no ─────────────────────────────
router.post('/:id/add-sale', auth, async (req, res) => {
  const { LoadingSheet, LoadingSheetItem, Sale } = req.models;
  const sheet = await LoadingSheet.findByPk(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (sheet.status === 'delivered') return res.status(400).json({ error: 'Sheet already delivered' });

  const { invoice_no } = req.body;
  if (!invoice_no) return res.status(400).json({ error: 'invoice_no is required' });

  const sale = await Sale.findOne({ where: { invoice_no: invoice_no.trim() } });
  if (!sale) return res.status(404).json({ error: `Invoice ${invoice_no} not found` });

  // Block if already on any sheet
  const existing = await LoadingSheetItem.findOne({ where: { sale_id: sale.id } });
  if (existing) {
    const existingSheet = await LoadingSheet.findByPk(existing.sheet_id);
    return res.status(400).json({ error: `Sale already on sheet ${existingSheet?.sheet_no}` });
  }

  await LoadingSheetItem.create({ sheet_id: sheet.id, sale_id: sale.id });
  const updated = await sheetWithItems(req.models, sheet.id);
  res.json(updated);
});

// ── DELETE /:id/items/:saleId — remove a sale from sheet ──────────────────────
router.delete('/:id/items/:saleId', auth, async (req, res) => {
  const { LoadingSheet, LoadingSheetItem } = req.models;
  const sheet = await LoadingSheet.findByPk(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (sheet.status === 'delivered') return res.status(400).json({ error: 'Sheet already delivered' });

  await LoadingSheetItem.destroy({ where: { sheet_id: sheet.id, sale_id: req.params.saleId } });
  res.json({ ok: true });
});

// ── POST /:id/deliver — mark whole sheet as delivered ─────────────────────────
router.post('/:id/deliver', auth, async (req, res) => {
  const sheet = await req.models.LoadingSheet.findByPk(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (sheet.status === 'delivered') return res.status(400).json({ error: 'Already delivered' });

  await sheet.update({ status: 'delivered', delivered_at: new Date() });
  res.json(sheet);
});

// ── DELETE /:id — delete open sheet ──────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  const { LoadingSheet, LoadingSheetItem } = req.models;
  const sheet = await LoadingSheet.findByPk(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
  if (sheet.status === 'delivered') return res.status(400).json({ error: 'Cannot delete a delivered sheet' });

  await LoadingSheetItem.destroy({ where: { sheet_id: sheet.id } });
  await sheet.destroy();
  res.json({ ok: true });
});

module.exports = router;
