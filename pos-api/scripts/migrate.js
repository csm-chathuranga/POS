/**
 * Tenant migration tool.
 *
 * Existing DB — schema only:
 *   node scripts/migrate.js <host>
 *
 * New DB — schema + seed (roles, settings, admin user):
 *   node scripts/migrate.js <host> --seed
 */
require('dotenv').config();
const readline  = require('readline');
const bcrypt    = require('bcryptjs');
const { Sequelize } = require('sequelize');
const getModels = require('../src/models');
const tenants   = require('../src/config/tenants');

const host  = process.argv[2];
const seed  = process.argv.includes('--seed');

if (!host) {
  console.log('Usage:');
  console.log('  node scripts/migrate.js <host>          — schema migration only');
  console.log('  node scripts/migrate.js <host> --seed   — schema + seed (new DB)');
  process.exit(1);
}

const tenant = tenants[host];
if (!tenant) {
  console.error(`\x1b[31m✖\x1b[0m  "${host}" not found in src/config/tenants.js`);
  process.exit(1);
}

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
      } else if (ch === '') { process.exit(); }
        else if (ch === '') { if (buf.length) { buf = buf.slice(0, -1); process.stdout.write('\b \b'); } }
        else { buf += ch; process.stdout.write('*'); }
    };
    process.stdin.on('data', onData);
  } else {
    rl.question(q, resolve);
  }
});

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
  console.log(`\n\x1b[1m── ${seed ? 'Migrate + Seed' : 'Migrate'}: ${host} → ${tenant.database} ──\x1b[0m\n`);

  let adminName, adminEmail, adminPass;
  if (seed) {
    adminName  = (await ask('Admin full name:   ')).trim();
    adminEmail = (await ask('Admin email:       ')).trim();
    adminPass  = (await ask('Admin password:    ', true)).trim();
    if (!adminName || !adminEmail || !adminPass) {
      console.error('\x1b[31m✖\x1b[0m  All fields required.'); process.exit(1);
    }
  }
  rl.close();

  const seq = new Sequelize(tenant.database, tenant.username, tenant.password, {
    host:    tenant.host || process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });

  await seq.authenticate();
  const models = getModels(seq);

  // ── Step 1: Schema ──────────────────────────────────────────────────────────
  console.log('\x1b[1mSchema migration\x1b[0m');
  await seq.sync({ alter: true });
  log('Tables created / updated.');

  if (seed) {
    const { User, Role, Setting } = models;

    // ── Step 2: Roles ─────────────────────────────────────────────────────────
    console.log('\n\x1b[1mRoles\x1b[0m');
    let adminRole;
    for (const name of DEFAULT_ROLES) {
      const [row, created] = await Role.findOrCreate({ where: { name } });
      if (name === 'admin') adminRole = row;
      created ? log(`Created: ${name}`) : warn(`Exists:  ${name}`);
    }

    // ── Step 3: Settings ──────────────────────────────────────────────────────
    console.log('\n\x1b[1mSettings\x1b[0m');
    for (const { key, value } of DEFAULT_SETTINGS) {
      const [, created] = await Setting.findOrCreate({ where: { key }, defaults: { value } });
      created ? log(`Created: ${key}`) : warn(`Exists:  ${key}`);
    }

    // ── Step 4: Admin user ────────────────────────────────────────────────────
    console.log('\n\x1b[1mAdmin user\x1b[0m');
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (existing) {
      warn(`User already exists: ${adminEmail} — skipped.`);
    } else {
      const hash = await bcrypt.hash(adminPass, 12);
      const user = await User.create({ name: adminName, email: adminEmail, password: hash });
      await user.addRole(adminRole);
      log(`Created: ${adminEmail}`);
    }
  }

  await seq.close();
  console.log(`\n\x1b[1mDone.\x1b[0m\n`);
}

main().catch(e => { console.error(`\x1b[31m✖\x1b[0m  ${e.message}`); process.exit(1); });
