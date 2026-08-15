/**
 * Interactive script to add a new POS tenant.
 *
 * Usage:
 *   node scripts/add-tenant.js
 *
 * What it does:
 *  1. Prompts for tenant details
 *  2. Creates the MySQL database
 *  3. Adds the entry to src/config/tenants.js
 *  4. Syncs all tables (alter — safe for existing data)
 *  5. Seeds roles (admin, cashier)
 *  6. Creates the first admin user
 *  7. Optionally restarts PM2
 */
require('dotenv').config();
const readline  = require('readline');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const getModels = require('../src/models');

const TENANTS_PATH = path.join(__dirname, '../src/config/tenants.js');

// ── helpers ──────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
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

function log(msg)  { console.log(`\x1b[32m✔\x1b[0m  ${msg}`); }
function warn(msg) { console.log(`\x1b[33m⚠\x1b[0m  ${msg}`); }
function err(msg)  { console.error(`\x1b[31m✖\x1b[0m  ${msg}`); }

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n\x1b[1m── POS Tenant Setup ──\x1b[0m\n');

  // 1. Collect details
  const host     = (await ask('Subdomain host (e.g. myshop-pos.lumac.cc): ')).trim();
  const dbName   = (await ask('Database name (e.g. myshop_db):             ')).trim();
  const dbUser   = (await ask(`DB username [pos_user]:                      `)).trim() || 'pos_user';
  const dbPass   = (await ask('DB password:                                 ', true)).trim();
  const dbHost   = (await ask(`DB host [${process.env.DB_HOST || 'localhost'}]:                        `)).trim()
                    || process.env.DB_HOST || 'localhost';
  const dbPort   = parseInt((await ask(`DB port [${process.env.DB_PORT || '3306'}]:                           `)).trim()
                    || process.env.DB_PORT || '3306');
  const rootUser = (await ask('\nMySQL root user [root]:                     ')).trim() || 'root';
  const rootPass = (await ask('MySQL root password:                         ', true)).trim();

  console.log('');
  const adminName  = (await ask('Admin user full name:                        ')).trim();
  const adminEmail = (await ask('Admin email:                                 ')).trim();
  const adminPass  = (await ask('Admin password:                              ', true)).trim();

  rl.close();

  // 2. Validate
  if (!host || !dbName || !dbPass || !adminEmail || !adminPass || !adminName) {
    err('All fields are required.'); process.exit(1);
  }

  // 3. Load existing tenants and check for duplicates
  const tenants = require(TENANTS_PATH);
  if (tenants[host]) {
    err(`Host "${host}" already exists in tenants.js`); process.exit(1);
  }

  // 4. Connect as root and create DB + grant
  console.log('\n\x1b[1mCreating database…\x1b[0m');
  const rootSeq = new Sequelize('', rootUser, rootPass, {
    host: dbHost, port: dbPort, dialect: 'mysql', logging: false,
  });
  await rootSeq.authenticate();
  await rootSeq.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await rootSeq.query(
    `GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%' IDENTIFIED BY '${dbPass}';`
  );
  await rootSeq.query(`FLUSH PRIVILEGES;`);
  await rootSeq.close();
  log(`Database "${dbName}" created and privileges granted.`);

  // 5. Patch tenants.js
  console.log('\n\x1b[1mUpdating tenants.js…\x1b[0m');
  let src = fs.readFileSync(TENANTS_PATH, 'utf8');
  const newEntry = `  '${host}': {\n    database: '${dbName}',\n    username: '${dbUser}',\n    password: '${dbPass}',\n  },\n`;
  // Insert before the closing };
  src = src.replace(/^};/m, `${newEntry}};`);
  fs.writeFileSync(TENANTS_PATH, src, 'utf8');
  log(`Tenant "${host}" added to tenants.js.`);

  // 6. Sync tables
  console.log('\n\x1b[1mSyncing tables…\x1b[0m');
  const tenantSeq = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost, port: dbPort, dialect: 'mysql', logging: false,
    define: { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });
  await tenantSeq.authenticate();
  const models = getModels(tenantSeq);
  await tenantSeq.sync({ alter: true });
  log('All tables created/updated.');

  // 7. Seed roles
  console.log('\n\x1b[1mSeeding roles…\x1b[0m');
  const { User, Role } = models;
  const [adminRole] = await Role.findOrCreate({ where: { name: 'admin' } });
  await Role.findOrCreate({ where: { name: 'cashier' } });
  log('Roles: admin, cashier.');

  // 8. Create admin user
  console.log('\n\x1b[1mCreating admin user…\x1b[0m');
  const existing = await User.findOne({ where: { email: adminEmail } });
  if (existing) {
    warn(`User ${adminEmail} already exists — skipped.`);
  } else {
    const hash = await bcrypt.hash(adminPass, 12);
    const user = await User.create({ name: adminName, email: adminEmail, password: hash });
    await user.addRole(adminRole);
    log(`Admin user created: ${adminEmail}`);
  }

  await tenantSeq.close();

  // 9. Done
  console.log(`
\x1b[1m── Setup complete ──\x1b[0m

  Host:     ${host}
  Database: ${dbName}
  Admin:    ${adminEmail}

Next steps:
  • Point DNS: ${host} → this server
  • Configure nginx to proxy ${host} → this API
  • Restart the API:  pm2 restart pos-api
  • Open the Electron app → Ctrl+Shift+P → set URL to https://${host}
`);
}

main().catch(e => { err(e.message); process.exit(1); });
