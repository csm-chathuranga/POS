/**
 * Create loading_sheets and loading_sheet_items tables for a tenant.
 * Usage: node scripts/migrate-loading-sheets.js <hostname|all>
 * Safe to re-run.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');

const ok   = m => console.log(`\x1b[32m✔\x1b[0m  ${m}`);
const fail = m => console.error(`\x1b[31m✖\x1b[0m  ${m}`);
const head = m => console.log(`\n\x1b[1m${m}\x1b[0m`);

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

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`loading_sheets\` (
        \`id\`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`sheet_no\`     VARCHAR(50)     NOT NULL UNIQUE,
        \`date\`         DATE            NOT NULL,
        \`note\`         TEXT            NULL,
        \`status\`       ENUM('open','delivered') NOT NULL DEFAULT 'open',
        \`delivered_at\` DATETIME        NULL,
        \`created_by\`   BIGINT UNSIGNED NULL,
        \`created_at\`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const lsCols = [
      "ALTER TABLE `loading_sheets` ADD COLUMN `sheet_no` VARCHAR(50) NOT NULL AFTER `id`",
      "ALTER TABLE `loading_sheets` ADD COLUMN `date` DATE NOT NULL AFTER `sheet_no`",
      "ALTER TABLE `loading_sheets` ADD COLUMN `note` TEXT NULL AFTER `date`",
      "ALTER TABLE `loading_sheets` ADD COLUMN `status` ENUM('open','delivered') NOT NULL DEFAULT 'open' AFTER `note`",
      "ALTER TABLE `loading_sheets` ADD COLUMN `delivered_at` DATETIME NULL AFTER `status`",
      "ALTER TABLE `loading_sheets` ADD COLUMN `created_by` BIGINT UNSIGNED NULL AFTER `delivered_at`",
      "ALTER TABLE `loading_sheets` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE `loading_sheets` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ];
    for (const sql of lsCols) {
      try { await sequelize.query(sql); } catch { /* already exists */ }
    }
    ok('loading_sheets table ready');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`loading_sheet_items\` (
        \`id\`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`sheet_id\`   BIGINT UNSIGNED NOT NULL,
        \`sale_id\`    BIGINT UNSIGNED NOT NULL,
        \`created_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_sheet_sale\` (\`sheet_id\`, \`sale_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const liCols = [
      "ALTER TABLE `loading_sheet_items` ADD COLUMN `sheet_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `id`",
      "ALTER TABLE `loading_sheet_items` ADD COLUMN `sale_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `sheet_id`",
      "ALTER TABLE `loading_sheet_items` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ];
    for (const sql of liCols) {
      try { await sequelize.query(sql); } catch { /* already exists */ }
    }
    ok('loading_sheet_items table ready');
  } catch (e) {
    fail(`${row.hostname}: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

async function run() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: node scripts/migrate-loading-sheets.js <hostname|all>'); process.exit(1); }
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
run().catch(e => { fail(e.message); process.exit(1); });
