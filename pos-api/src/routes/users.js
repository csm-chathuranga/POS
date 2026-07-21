const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const auth    = require('../middleware/auth');
const role    = require('../middleware/role');

router.get('/', auth, role('admin'), async (req, res) => {
  const { User, Role } = req.models;
  const users = await User.findAll({
    include: [{ model: Role, through: { attributes: [] } }],
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']],
  });
  res.json(users.map(u => ({ ...u.toJSON(), role: u.Roles?.[0]?.name ?? 'cashier' })));
});

router.post('/', auth, role('admin'), async (req, res) => {
  const { User, Role } = req.models;
  const { role: roleName, password, ...data } = req.body;
  data.password = await bcrypt.hash(password, 12);
  const user = await User.create(data);
  const roleRow = await Role.findOne({ where: { name: roleName || 'cashier' } });
  if (roleRow) await user.addRole(roleRow);
  res.status(201).json({ ...user.toJSON(), password: undefined, role: roleName });
});

router.put('/:id', auth, role('admin'), async (req, res) => {
  const { User, Role } = req.models;
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  const { role: roleName, password, ...data } = req.body;
  if (password) data.password = await bcrypt.hash(password, 12);
  await user.update(data);

  if (roleName) {
    const roleRow = await Role.findOne({ where: { name: roleName } });
    if (roleRow) await user.setRoles([roleRow]);
  }
  res.json({ ...user.toJSON(), password: undefined, role: roleName });
});

router.delete('/:id', auth, role('admin'), async (req, res) => {
  const { User } = req.models;
  if (req.params.id == req.user.id) return res.status(422).json({ error: 'Cannot delete yourself' });
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  await user.destroy();
  res.json({ message: 'Deleted' });
});

module.exports = router;
