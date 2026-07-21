const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

// Public — no auth needed (login page uses this)
router.get('/public', async (req, res) => {
  const { Setting } = req.models;
  const rows = await Setting.findAll({ where: { key: ['shop_name', 'shop_logo', 'address', 'phone', 'receipt_footer', 'currency', 'interface_language', 'receipt_language'] } });
  res.json(Object.fromEntries(rows.map(s => [s.key, s.value])));
});

router.get('/', auth, async (req, res) => {
  const { Setting } = req.models;
  const settings = await Setting.findAll();
  res.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
});

router.post('/', auth, role('admin'), async (req, res) => {
  const { Setting } = req.models;
  for (const [key, value] of Object.entries(req.body)) {
    await Setting.upsert({ key, value: value ?? '' });
  }
  const settings = await Setting.findAll();
  res.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
});

module.exports = router;
