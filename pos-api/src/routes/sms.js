const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');
const { sendSms, interpolate } = require('../lib/sms');

async function requireModule(req, res, next) {
  const s = await req.models.Setting.findOne({ where: { key: 'module.sms.enabled' } });
  if (s?.value !== 'true') return res.status(403).json({ error: 'SMS module is not enabled' });
  next();
}

router.use(auth, (req, res, next) => requireModule(req, res, next).catch(next));

// ── Config ────────────────────────────────────────────────────────────────────

router.get('/config', role('admin'), async (req, res) => {
  const cfg = await req.models.SmsConfig.findOne();
  if (!cfg) return res.json(null);
  res.json({
    user_id:          cfg.user_id,
    api_key:          '', // never expose key
    sender_id:        cfg.sender_id,
    receipt_template: cfg.receipt_template,
  });
});

router.post('/config', role('admin'), async (req, res) => {
  const { user_id, api_key, sender_id, receipt_template } = req.body;
  if (!user_id || !sender_id || !receipt_template) {
    return res.status(422).json({ error: 'user_id, sender_id and receipt_template are required' });
  }
  const existing = await req.models.SmsConfig.findOne();
  if (existing) {
    const update = { user_id, sender_id, receipt_template };
    if (api_key) update.api_key = api_key; // only update if provided
    await existing.update(update);
    res.json({ ok: true });
  } else {
    if (!api_key) return res.status(422).json({ error: 'api_key is required for initial setup' });
    await req.models.SmsConfig.create({ user_id, api_key, sender_id, receipt_template });
    res.status(201).json({ ok: true });
  }
});

// ── Test send ─────────────────────────────────────────────────────────────────

router.post('/test', role('admin'), async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(422).json({ error: 'phone is required' });

  const cfg = await req.models.SmsConfig.findOne();
  if (!cfg || !cfg.user_id) return res.status(400).json({ error: 'SMS not configured yet' });

  const message = interpolate(cfg.receipt_template, {
    customer:   'Test Customer',
    invoice_no: 'INV-TEST-0001',
    total:      '1000.00',
    date:       new Date().toLocaleDateString(),
    store_name: (await req.models.Setting.findOne({ where: { key: 'store_name' } }))?.value || 'Store',
  });

  const { ok, error } = await sendSms(cfg, phone, message);
  await req.models.SmsLog.create({ sale_id: null, phone, message, status: ok ? 'sent' : 'failed', error: error || null });
  if (!ok) return res.status(502).json({ error: error || 'SMS send failed' });
  res.json({ ok: true, message });
});

// ── Send receipt for a specific sale ─────────────────────────────────────────

router.post('/send-receipt', async (req, res) => {
  const { sale_id, phone: overridePhone } = req.body;
  if (!sale_id) return res.status(422).json({ error: 'sale_id is required' });

  const { Sale, Customer, SmsConfig, SmsLog, Setting } = req.models;
  const sale = await Sale.findByPk(sale_id, {
    include: [{ model: Customer, as: 'customer', attributes: ['name', 'phone'] }],
  });
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  const cfg = await SmsConfig.findOne();
  if (!cfg || !cfg.user_id) return res.status(400).json({ error: 'SMS not configured' });

  const phone = overridePhone || sale.customer?.phone;
  if (!phone) return res.status(422).json({ error: 'No phone number available. Pass phone in request.' });

  const storeName = (await Setting.findOne({ where: { key: 'store_name' } }))?.value || 'Store';
  const message   = interpolate(cfg.receipt_template, {
    customer:   sale.customer?.name || 'Customer',
    invoice_no: sale.invoice_no,
    total:      parseFloat(sale.total).toFixed(2),
    date:       new Date(sale.created_at).toLocaleDateString(),
    store_name: storeName,
  });

  const { ok, error } = await sendSms(cfg, phone, message);
  await SmsLog.create({ sale_id: sale.id, phone, message, status: ok ? 'sent' : 'failed', error: error || null });

  if (!ok) return res.status(502).json({ error: error || 'SMS send failed' });
  res.json({ ok: true, phone, message });
});

// ── Logs ──────────────────────────────────────────────────────────────────────

router.get('/logs', role('admin'), async (req, res) => {
  const page  = parseInt(req.query.page || '1');
  const limit = 25;
  const { count, rows } = await req.models.SmsLog.findAndCountAll({
    order: [['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  res.json({ data: rows, total: count, page, last_page: Math.ceil(count / limit) });
});

module.exports = router;
