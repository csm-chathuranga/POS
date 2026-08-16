const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  const { Category } = req.models;
  const rows = await Category.findAll({ order: [['name', 'ASC']] });
  res.json(rows);
});

router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(422).json({ error: 'Name is required' });
    const cat = await req.models.Category.create({ name });
    res.status(201).json(cat);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.put('/:id', auth, role('admin', 'manager'), async (req, res) => {
  try {
    const { Category } = req.models;
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(422).json({ error: 'Name is required' });
    await cat.update({ name });
    res.json(cat);
  } catch (e) { res.status(422).json({ error: e.message }); }
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  try {
    const { Category } = req.models;
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Not found' });
    await cat.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(422).json({ error: e.message }); }
});

module.exports = router;
