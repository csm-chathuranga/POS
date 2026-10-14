/**
 * Create / update employees and salary_payments tables for a tenant.
 * Usage: node scripts/migrate-employees.js <hostname|all>
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
      CREATE TABLE IF NOT EXISTS \`employees\` (
        \`id\`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\`         VARCHAR(191)    NOT NULL,
        \`position\`     VARCHAR(191)    NULL,
        \`phone\`        VARCHAR(50)     NULL,
        \`address\`      TEXT            NULL,
        \`basic_salary\` DECIMAL(10,2)   NOT NULL DEFAULT 0,
        \`hired_date\`   DATE            NULL,
        \`active\`       TINYINT(1)      NOT NULL DEFAULT 1,
        \`created_at\`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const empCols = [
      "ALTER TABLE `employees` ADD COLUMN `name` VARCHAR(191) NOT NULL AFTER `id`",
      "ALTER TABLE `employees` ADD COLUMN `position` VARCHAR(191) NULL AFTER `name`",
      "ALTER TABLE `employees` ADD COLUMN `phone` VARCHAR(50) NULL AFTER `position`",
      "ALTER TABLE `employees` ADD COLUMN `address` TEXT NULL AFTER `phone`",
      "ALTER TABLE `employees` ADD COLUMN `basic_salary` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `address`",
      "ALTER TABLE `employees` ADD COLUMN `hired_date` DATE NULL AFTER `basic_salary`",
      "ALTER TABLE `employees` ADD COLUMN `active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `hired_date`",
      "ALTER TABLE `employees` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE `employees` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ];
    for (const sql of empCols) {
      try { await sequelize.query(sql); } catch { /* already exists */ }
    }
    ok('employees table ready');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`salary_payments\` (
        \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`ref_no\`      VARCHAR(191)    NULL UNIQUE,
        \`employee_id\` BIGINT UNSIGNED NOT NULL,
        \`user_id\`     BIGINT UNSIGNED NOT NULL,
        \`period\`      VARCHAR(20)     NOT NULL,
        \`amount\`      DECIMAL(10,2)   NOT NULL,
        \`note\`        VARCHAR(191)    NULL,
        \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const salCols = [
      "ALTER TABLE `salary_payments` ADD COLUMN `ref_no` VARCHAR(191) NULL UNIQUE AFTER `id`",
      "ALTER TABLE `salary_payments` ADD COLUMN `employee_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `ref_no`",
      "ALTER TABLE `salary_payments` ADD COLUMN `user_id` BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER `employee_id`",
      "ALTER TABLE `salary_payments` ADD COLUMN `period` VARCHAR(20) NOT NULL DEFAULT '' AFTER `user_id`",
      "ALTER TABLE `salary_payments` ADD COLUMN `amount` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `period`",
      "ALTER TABLE `salary_payments` ADD COLUMN `note` VARCHAR(191) NULL AFTER `amount`",
      "ALTER TABLE `salary_payments` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
      "ALTER TABLE `salary_payments` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    ];
    for (const sql of salCols) {
      try { await sequelize.query(sql); } catch { /* already exists */ }
    }
    ok('salary_payments table ready');
  } catch (e) {
    fail(`${row.hostname}: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

async function run() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: node scripts/migrate-employees.js <hostname|all>'); process.exit(1); }
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
