const router  = require('express').Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');
const MODULES = require('../config/modules');

// GET /api/admin/modules — list all modules with enabled state
router.get('/', auth, role('admin'), async (req, res) => {
  const { Setting } = req.models;
  const keys    = MODULES.map(m => `module.${m.key}.enabled`);
  const rows    = await Setting.findAll({ where: { key: keys } });
  const byKey   = Object.fromEntries(rows.map(r => [r.key, r.value]));

  res.json(MODULES.map(m => ({
    key:            m.key,
    label:          m.label,
    description:    m.description,
    insertsFeature: m.insertsFeature,
    enabled:        byKey[`module.${m.key}.enabled`] === 'true',
  })));
});

// PATCH /api/admin/modules/:key/toggle — flip a module on or off
router.patch('/:key/toggle', auth, role('admin'), async (req, res) => {
  const mod = MODULES.find(m => m.key === req.params.key);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  const { Setting, Feature } = req.models;
  const settingKey = `module.${mod.key}.enabled`;

  const current  = await Setting.findOne({ where: { key: settingKey } });
  const newValue = current?.value !== 'true';

  if (newValue && mod.requires) {
    const dep = await Setting.findOne({ where: { key: `module.${mod.requires}.enabled` } });
    if (dep?.value !== 'true') return res.status(400).json({ error: `Enable the ${mod.requires} module first` });
  }
  if (!newValue) {
    const dependents = MODULES.filter(m => m.requires === mod.key);
    for (const d of dependents) {
      const s = await Setting.findOne({ where: { key: `module.${d.key}.enabled` } });
      if (s?.value === 'true') return res.status(400).json({ error: `Disable the ${d.label} module first` });
    }
  }

  if (newValue && mod.key === 'coop_city') {
    await require('../lib/coopCity').ensureCoopTables(req.db);
  }

  await Setting.upsert({ key: settingKey, value: String(newValue) });

  if (mod.insertsFeature) {
    if (newValue) {
      await Feature.upsert(mod.feature);
    } else {
      await Feature.destroy({ where: { key: mod.feature.key } });
    }
  }

  res.json({ key: mod.key, enabled: newValue });
});

module.exports = router;
