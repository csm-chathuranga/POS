/**
 * Tenant migration tool.
 *
 * Schema only (safe, keeps data):
 *   node scripts/migrate.js <host>
 *
 * Schema + seed (roles, settings, default users):
 *   node scripts/migrate.js <host> --seed
 *
 * Drop everything and start fresh + seed:
 *   node scripts/migrate.js <host> --fresh
 */
require('dotenv').config();
const bcrypt    = require('bcryptjs');
const { Sequelize } = require('sequelize');
const getModels = require('../src/models');
const tenants   = require('../src/config/tenants');

const host  = process.argv[2];
const fresh = process.argv.includes('--fresh');
const seed  = fresh || process.argv.includes('--seed');

if (!host) {
  console.log('Usage:');
  console.log('  node scripts/migrate.js <host>           — schema only (safe)');
  console.log('  node scripts/migrate.js <host> --seed    — schema + seed');
  console.log('  node scripts/migrate.js <host> --fresh   — drop all + seed (destructive)');
  process.exit(1);
}

const tenant = tenants[host];
if (!tenant) {
  console.error(`\x1b[31m✖\x1b[0m  "${host}" not found in src/config/tenants.js`);
  process.exit(1);
}

const log  = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);
const warn = m => console.log(`\x1b[33m⚠\x1b[0m  ${m}`);

const DEFAULT_ROLES = ['admin', 'manager', 'cashier'];
const DEFAULT_SETTINGS = [
  { key: 'shop_name',        value: '' },
  { key: 'address',          value: '' },
  { key: 'phone',            value: '' },
  { key: 'currency',         value: 'Rs.' },
  { key: 'receipt_language', value: 'en' },
  { key: 'receipt_footer',   value: 'Thank you for shopping with us!' },
  { key: 'tax_rate',         value: '0' },
];

async function main() {
  const mode = fresh ? 'Fresh (drop all) + Seed' : seed ? 'Migrate + Seed' : 'Migrate';
  console.log(`\n\x1b[1m── ${mode}: ${host} → ${tenant.database} ──\x1b[0m\n`);
  if (fresh) console.log('\x1b[33m⚠\x1b[0m  --fresh will DROP all tables. Ctrl+C to abort.\n');

  const DEFAULT_USERS = [
    { name: 'Admin',   email: 'admin@lumac.lk',   password: '123', role: 'admin' },
    { name: 'Manager', email: 'manager@lumac.lk', password: '123', role: 'manager' },
    { name: 'Cashier', email: 'cashier@lumac.lk', password: '123', role: 'cashier' },
  ];

  const seq = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });
  seq.addHook('afterConnect', (connection) => new Promise((resolve, reject) => {
    connection.query('SET FOREIGN_KEY_CHECKS = 0', (err) => err ? reject(err) : resolve());
  }));

  await seq.authenticate();
  const models = getModels(seq);

  // ── Step 1: Schema ──────────────────────────────────────────────────────────
  console.log('\x1b[1mSchema migration\x1b[0m');

  if (fresh) {
    await seq.sync({ force: true });
    log('All tables dropped and recreated.');
  } else {
    // Drop legacy check constraints — models define none; old constraints break ALTER TABLE
    const [chkRows] = await seq.query(
      `SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_TYPE = 'CHECK' AND TABLE_SCHEMA = DATABASE()`
    );
    for (const { TABLE_NAME, CONSTRAINT_NAME } of chkRows) {
      try {
        await seq.query(`ALTER TABLE \`${TABLE_NAME}\` DROP CHECK \`${CONSTRAINT_NAME}\``);
      } catch (_) { /* already gone */ }
    }
    await seq.sync({ alter: true });
    log('Tables created / updated.');
  }

  if (seed) {
    const { User, Role, Setting } = models;

    // ── Step 2: Roles ─────────────────────────────────────────────────────────
    console.log('\n\x1b[1mRoles\x1b[0m');
    const roleMap = {};
    for (const name of DEFAULT_ROLES) {
      const [row, created] = await Role.findOrCreate({ where: { name } });
      roleMap[name] = row;
      created ? log(`Created: ${name}`) : warn(`Exists:  ${name}`);
    }

    // ── Step 3: Settings ──────────────────────────────────────────────────────
    console.log('\n\x1b[1mSettings\x1b[0m');
    for (const { key, value } of DEFAULT_SETTINGS) {
      const [, created] = await Setting.findOrCreate({ where: { key }, defaults: { value } });
      created ? log(`Created: ${key}`) : warn(`Exists:  ${key}`);
    }

    // ── Step 4: Default users ─────────────────────────────────────────────────
    console.log('\n\x1b[1mUsers\x1b[0m');
    for (const u of DEFAULT_USERS) {
      const existing = await User.findOne({ where: { email: u.email } });
      if (existing) {
        warn(`Exists:  ${u.email}`);
      } else {
        const hash = await bcrypt.hash(u.password, 12);
        const user = await User.create({ name: u.name, email: u.email, password: hash });
        await user.addRole(roleMap[u.role]);
        log(`Created: ${u.email} (${u.role})`);
      }
    }
  }

  await seq.close();
  console.log(`\n\x1b[1mDone.\x1b[0m\n`);
}

main().catch(e => { console.error(`\x1b[31m✖\x1b[0m  ${e.message}`); process.exit(1); });
