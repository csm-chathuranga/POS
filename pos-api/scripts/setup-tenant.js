/**
 * One-time tenant setup script.
 * Creates all tables and seeds an admin user + default roles.
 *
 * Usage:
 *   node scripts/setup-tenant.js <host> <admin-email> <admin-password> <admin-name>
 *
 * Example:
 *   node scripts/setup-tenant.js newshop-pos.lumac.cc admin@shop.com Admin@123 "Shop Admin"
 */
require('dotenv').config();
const bcrypt   = require('bcryptjs');
const { Sequelize } = require('sequelize');
const getModels     = require('../src/models');
const tenants       = require('../src/config/tenants');

const [,, host, email, password, name = 'Admin'] = process.argv;

if (!host || !email || !password) {
  console.error('Usage: node scripts/setup-tenant.js <host> <email> <password> [name]');
  process.exit(1);
}

const tenant = tenants[host];
if (!tenant) {
  console.error(`Host "${host}" not found in tenants.js — add it first.`);
  process.exit(1);
}

async function run() {
  const sequelize = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });

  await sequelize.authenticate();
  console.log(`Connected to database: ${tenant.database}`);

  const models = getModels(sequelize);
  const { User, Role } = models;

  // Create all tables (safe — won't drop existing data)
  await sequelize.sync({ alter: true });
  console.log('Tables synced.');

  // Seed roles
  const [adminRole] = await Role.findOrCreate({ where: { name: 'admin' } });
  await Role.findOrCreate({ where: { name: 'cashier' } });
  console.log('Roles seeded.');

  // Create admin user
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping.`);
  } else {
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash });
    await user.addRole(adminRole);
    console.log(`Admin user created: ${email}`);
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch(err => { console.error(err.message); process.exit(1); });
