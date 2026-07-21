const jwt = require('jsonwebtoken');

module.exports = async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { User, Role } = req.models;

    const user = await User.findByPk(payload.userId, {
      include: [{ model: Role, through: { attributes: [] } }],
      attributes: { exclude: ['password'] },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });

    user.role  = user.Roles?.[0]?.name ?? 'cashier';
    req.user   = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
