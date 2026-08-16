const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');

async function getRoleFeatures(Role, Feature, roleId) {
  if (!roleId) return null;
  const r = await Role.findByPk(roleId, {
    include: [{ model: Feature, through: { attributes: [] } }],
  });
  return r?.Features?.map(f => f.key) ?? null;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(422).json({ error: 'Email and password required' });

  const { User, Role, Feature } = req.models;
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, through: { attributes: [] } }],
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const roleObj = user.Roles?.[0];
  const roleName = roleObj?.name ?? 'cashier';
  const features = roleName === 'admin' ? null : await getRoleFeatures(Role, Feature, roleObj?.id);

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: roleName, tenant: req.tenant },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    token,
    user: {
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     roleName,
      features, // null means all access (admin)
    },
  });
});

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => {
  // JWT is stateless — client discards the token
  res.json({ message: 'Logged out' });
});

// GET /api/me
router.get('/me', auth, async (req, res) => {
  const { Setting, User, Role, Feature } = req.models;
  const [settings, userWithRole] = await Promise.all([
    Setting.findAll(),
    User.findByPk(req.user.id, { include: [{ model: Role, through: { attributes: [] } }] }),
  ]);
  const appSettings = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const roleObj  = userWithRole?.Roles?.[0];
  const roleName = roleObj?.name ?? req.user.role;
  const features = roleName === 'admin' ? null : await getRoleFeatures(Role, Feature, roleObj?.id);

  res.json({
    user: {
      id:       req.user.id,
      name:     req.user.name,
      email:    req.user.email,
      role:     roleName,
      features,
    },
    appSettings,
  });
});

module.exports = router;
