/**
 * Provision a single tenant: migrate schema + seed master data + create admin user.
 *
 * Usage:
 *   node scripts/migrate.js <host>
 *
 * Example:
 *   node scripts/migrate.js newshop-pos.lumac.cc
 *
 * The host must already exist in src/config/tenants.js.
 * To add a brand-new tenant (including creating the DB), use add-tenant.js instead.
 */
require('dotenv').config();
const readline  = require('readline');
const bcrypt    = require('bcryptjs');
const { Sequelize } = require('sequelize');
const getModels = require('../src/models');
const tenants   = require('../src/config/tenants');

const host = process.argv[2];
if (!host) {
  console.error('Usage: node scripts/migrate.js <host>');
  console.error('Example: node scripts/migrate.js newshop-pos.lumac.cc');
  process.exit(1);
}

const tenant = tenants[host];
if (!tenant) {
  console.error(`\x1b[31m✖\x1b[0m  Host "${host}" not found in src/config/tenants.js`);
  console.error('   Add it first, then re-run this script.');
  process.exit(1);
}

// ── helpers ───────────────────────────────────────────────────────────────────
const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, hidden = false) => new Promise(resolve => {
  if (hidden && process.stdin.isTTY) {
    process.stdout.write(q);
    process.stdin.setRawMode(true);
    let buf = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = ch => {
      if (ch === '\n' || ch === '\r') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(buf);
      } else if (ch === '') {
        process.exit();
      } else if (ch === '') {
        if (buf.length) { buf = buf.slice(0, -1); process.stdout.write('\b \b'); }
      } else {
        buf += ch;
        process.stdout.write('*');
      }
    };
    process.stdin.on('data', onData);
  } else {
    rl.question(q, resolve);
  }
});

const log  = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);
const warn = m => console.log(`\x1b[33m⚠\x1b[0m  ${m}`);
const info = m => console.log(`\x1b[36mℹ\x1b[0m  ${m}`);

// ── default master data ───────────────────────────────────────────────────────
const DEFAULT_ROLES      = ['admin', 'manager', 'cashier'];
const DEFAULT_CATEGORIES = ['General', 'Other'];
const DEFAULT_SETTINGS   = [
  { key: 'shop_name',        value: '' },
  { key: 'address',          value: '' },
  { key: 'phone',            value: '' },
  { key: 'currency',         value: 'Rs.' },
  { key: 'receipt_language', value: 'en' },
  { key: 'receipt_footer',   value: 'Thank you for shopping with us!' },
  { key: 'tax_rate',         value: '0' },
];

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n\x1b[1m── Provisioning: ${host} → ${tenant.database} ──\x1b[0m\n`);

  // Prompt for admin user
  const adminName  = (await ask('Admin full name:   ')).trim();
  const adminEmail = (await ask('Admin email:       ')).trim();
  const adminPass  = (await ask('Admin password:    ', true)).trim();
  rl.close();

  if (!adminName || !adminEmail || !adminPass) {
    console.error('\x1b[31m✖\x1b[0m  All fields are required.'); process.exit(1);
  }

  // Connect
  const seq = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });

  await seq.authenticate();
  info(`Connected to: ${tenant.database}`);

  const models = getModels(seq);
  const { User, Role, Category, Setting } = models;

  // 1. Migrate schema
  console.log('\n\x1b[1mStep 1 — Schema\x1b[0m');
  await seq.sync({ alter: true });
  log('All tables created / updated.');

  // 2. Seed roles
  console.log('\n\x1b[1mStep 2 — Roles\x1b[0m');
  let adminRole;
  for (const name of DEFAULT_ROLES) {
    const [row, created] = await Role.findOrCreate({ where: { name } });
    if (name === 'admin') adminRole = row;
    created ? log(`Role created: ${name}`) : warn(`Role exists:  ${name}`);
  }

  // 3. Seed default categories
  console.log('\n\x1b[1mStep 3 — Categories\x1b[0m');
  for (const name of DEFAULT_CATEGORIES) {
    const [, created] = await Category.findOrCreate({ where: { name } });
    created ? log(`Category created: ${name}`) : warn(`Category exists:  ${name}`);
  }

  // 4. Seed default settings
  console.log('\n\x1b[1mStep 4 — Settings\x1b[0m');
  for (const { key, value } of DEFAULT_SETTINGS) {
    const [, created] = await Setting.findOrCreate({ where: { key }, defaults: { value } });
    created ? log(`Setting created: ${key}`) : warn(`Setting exists:  ${key}`);
  }

  // 5. Create admin user
  console.log('\n\x1b[1mStep 5 — Admin user\x1b[0m');
  const existing = await User.findOne({ where: { email: adminEmail } });
  if (existing) {
    warn(`User already exists: ${adminEmail} — skipped.`);
  } else {
    const hash = await bcrypt.hash(adminPass, 12);
    const user = await User.create({ name: adminName, email: adminEmail, password: hash });
    await user.addRole(adminRole);
    log(`Admin user created: ${adminEmail}`);
  }

  await seq.close();

  console.log(`
\x1b[1m── Done ──\x1b[0m

  Tenant:   ${host}
  Database: ${tenant.database}
  Admin:    ${adminEmail}

Next:
  • pm2 restart pos-api  (or restart the API server)
  • Log in at https://${host}
`);
}

main().catch(e => { console.error(`\x1b[31m✖\x1b[0m  ${e.message}`); process.exit(1); });
