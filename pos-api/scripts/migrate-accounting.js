/**
 * Create / update accounting tables for a tenant.
 *
 * Usage:
 *   node scripts/migrate-accounting.js <hostname>
 *   node scripts/migrate-accounting.js all          ← all active tenants
 *
 * Safe to re-run (ALTER TABLE, never drops data).
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');
const getModels = require('../src/models');

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
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });

  try {
    await sequelize.authenticate();
    const { Account, JournalEntry, JournalLine } = getModels(sequelize);

    await Account.sync({ alter: true });
    ok('accounts table ready');

    // Create journal_entries with full schema (safe if exists)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`journal_entries\` (
        \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`ref_no\`      VARCHAR(20)  NOT NULL,
        \`date\`        DATE         NOT NULL,
        \`description\` TEXT         NULL,
        \`user_id\`     BIGINT UNSIGNED NOT NULL,
        \`created_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Add missing columns if table already existed without them
    const jeAddCols = [
      "ALTER TABLE `journal_entries` ADD COLUMN `ref_no` VARCHAR(20) NOT NULL DEFAULT '' AFTER `id`",
      "ALTER TABLE `journal_entries` ADD COLUMN `date` DATE NOT NULL AFTER `ref_no`",
      "ALTER TABLE `journal_entries` ADD COLUMN `description` TEXT NULL AFTER `date`",
      "ALTER TABLE `journal_entries` ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER `description`",
      "ALTER TABLE `journal_entries` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE `journal_entries` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ];
    for (const sql of jeAddCols) {
      try { await sequelize.query(sql); } catch { /* column already exists */ }
    }
    // Add unique index on ref_no if not present
    try {
      await sequelize.query("ALTER TABLE `journal_entries` ADD UNIQUE INDEX `journal_entries_ref_no_unique` (`ref_no`)");
    } catch { /* index already exists */ }
    ok('journal_entries table ready');

    // Create journal_lines with full schema (safe if exists)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`journal_lines\` (
        \`id\`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`entry_id\`   BIGINT UNSIGNED NOT NULL,
        \`account_id\` BIGINT UNSIGNED NOT NULL,
        \`debit\`      DECIMAL(12,2)   NOT NULL DEFAULT 0,
        \`credit\`     DECIMAL(12,2)   NOT NULL DEFAULT 0,
        \`note\`       VARCHAR(191)    NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const jlAddCols = [
      "ALTER TABLE `journal_lines` ADD COLUMN `entry_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `id`",
      "ALTER TABLE `journal_lines` ADD COLUMN `account_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `entry_id`",
      "ALTER TABLE `journal_lines` ADD COLUMN `debit` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `account_id`",
      "ALTER TABLE `journal_lines` ADD COLUMN `credit` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `debit`",
      "ALTER TABLE `journal_lines` ADD COLUMN `note` VARCHAR(191) NULL AFTER `credit`",
    ];
    for (const sql of jlAddCols) {
      try { await sequelize.query(sql); } catch { /* column already exists */ }
    }
    ok('journal_lines table ready');
  } catch (e) {
    fail(`${row.hostname}: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

async function run() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/migrate-accounting.js <hostname|all>');
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

run().catch(e => { fail(e.message); process.exit(1); });
