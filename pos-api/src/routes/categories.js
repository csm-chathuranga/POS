const router = require('express').Router();
const auth   = require('../middleware/auth');
const role   = require('../middleware/role');

router.get('/', auth, async (req, res) => {
  const { Category } = req.models;
  res.json(await Category.findAll({ order: [['name', 'ASC']] }));
});

router.post('/', auth, role('admin', 'manager'), async (req, res) => {
  const { Category } = req.models;
  const cat = await Category.create(req.body);
  res.status(201).json(cat);
});

router.put('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Category } = req.models;
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  await cat.update(req.body);
  res.json(cat);
});

router.delete('/:id', auth, role('admin', 'manager'), async (req, res) => {
  const { Category } = req.models;
  const cat = await Category.findByPk(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  await cat.destroy();
  res.json({ message: 'Deleted' });
});

module.exports = router;
