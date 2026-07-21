const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(422).json({ error: 'Email and password required' });

  const { User, Role } = req.models;
  const user = await User.findOne({
    where: { email },
    include: [{ model: Role, through: { attributes: [] } }],
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const role  = user.Roles?.[0]?.name ?? 'cashier';
  const token = jwt.sign(
    { userId: user.id, email: user.email, role, tenant: req.tenant },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role,
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
  const { Setting } = req.models;
  const settings = await Setting.findAll();
  const appSettings = Object.fromEntries(settings.map(s => [s.key, s.value]));

  res.json({
    user: {
      id:    req.user.id,
      name:  req.user.name,
      email: req.user.email,
      role:  req.user.role,
    },
    appSettings,
  });
});

module.exports = router;
