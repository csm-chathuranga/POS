const tenants = require('../config/tenants');
const { getTenantDb } = require('../config/db');

module.exports = function tenantMiddleware(req, res, next) {
  const host   = req.hostname;
  const tenant = tenants[host];

  if (!tenant) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: `Unknown host: ${host}` });
    }
    // Dev fallback — use localhost config
    const fallback = tenants['localhost'];
    if (!fallback) return res.status(500).json({ error: 'No localhost tenant configured' });
    const { models, sequelize } = getTenantDb(fallback, 'localhost');
    req.models = models;
    req.db     = sequelize;
    req.tenant = 'localhost';
    return next();
  }

  const { models, sequelize } = getTenantDb(tenant, host);
  req.models = models;
  req.db     = sequelize;
  req.tenant = host;
  next();
};
