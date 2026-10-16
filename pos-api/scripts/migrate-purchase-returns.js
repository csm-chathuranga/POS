/**
 * One-time migration: creates the purchase_returns table
 * in every existing active tenant database.
 *
 * Usage:
 *   node scripts/migrate-purchase-returns.js all
 *   node scripts/migrate-purchase-returns.js <hostname>
 *
 * Safe to re-run (CREATE TABLE IF NOT EXISTS).
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');

const ok   = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);
const fail = m => console.error(`\x1b[31m✖\x1b[0m  ${m}`);
const head = m => console.log(`\n\x1b[1m${m}\x1b[0m`);

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS \`purchase_returns\` (
    \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`purchase_id\` BIGINT UNSIGNED NOT NULL,
    \`user_id\`     BIGINT UNSIGNED NOT NULL,
    \`return_no\`   VARCHAR(191)    NOT NULL,
    \`reason\`      TEXT            NULL,
    \`total\`       DECIMAL(12, 2)  NOT NULL DEFAULT 0,
    \`items\`       JSON            NOT NULL,
    \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`purchase_returns_return_no_unique\` (\`return_no\`),
    KEY \`purchase_returns_purchase_id\` (\`purchase_id\`),
    CONSTRAINT \`fk_pr_purchase\` FOREIGN KEY (\`purchase_id\`) REFERENCES \`purchases\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function migrateTenant(row) {
  head(`Tenant: ${row.hostname}  (${row.db_name})`);

  const sequelize = new Sequelize(row.db_name, row.db_user, row.db_password, {
    host:    row.db_host || process.env.DB_HOST || 'localhost',
    port:    parseInt(row.db_port || process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    await sequelize.query(CREATE_SQL);
    ok(`purchase_returns table ready  →  ${row.db_name}`);
  } catch (e) {
    fail(`${row.hostname}: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

async function run() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/migrate-purchase-returns.js <hostname|all>');
    process.exit(1);
  }

  const { master, Tenant } = getMasterDb();
  await master.authenticate();

  let tenants;
  if (arg === 'all') {
    tenants = await Tenant.findAll({ where: { active: true }, order: [['hostname', 'ASC']] });
  } else {
    const t = await Tenant.findOne({ where: { hostname: arg, active: true } });
    if (!t) { fail(`Tenant "${arg}" not found`); process.exit(1); }
    tenants = [t];
  }

  for (const t of tenants) await migrateTenant(t.dataValues);

  console.log('\n\x1b[32mDone.\x1b[0m\n');
  await master.close();
}

run().catch(e => { console.error(e); process.exit(1); });
