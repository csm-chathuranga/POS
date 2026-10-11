/**
 * Targeted migration: supplier credit feature
 *
 * Applies to ALL active tenants from the master DB:
 *   1. ADD COLUMN suppliers.payable_balance (if absent)
 *   2. CREATE TABLE supplier_payments        (if absent)
 *   3. INSERT feature 'supplier_credit'      (if absent)
 *
 * Usage:
 *   node scripts/add-supplier-credit.js
 *   node scripts/add-supplier-credit.js --dry-run   (preview only, no changes)
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const isDry = process.argv.includes('--dry-run');

const ok   = m => console.log(`  \x1b[32m✔\x1b[0m  ${m}`);
const skip = m => console.log(`  \x1b[33m–\x1b[0m  ${m}`);
const fail = m => console.log(`  \x1b[31m✖\x1b[0m  ${m}`);
const info = m => console.log(`\n\x1b[1m${m}\x1b[0m`);

const FEATURE = {
  key:        'supplier_credit',
  label:      'Supplier Payables',
  path:       '/supplier-credit',
  group:      'main',
  sort_order: 11,
  icon:       'credit',
  offline_ok: false,
};

async function columnExists(seq, table, column) {
  const [rows] = await seq.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows[0].cnt > 0;
}

async function tableExists(seq, table) {
  const [rows] = await seq.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return rows[0].cnt > 0;
}

async function migrateTenant(tenant) {
  const seq = new Sequelize(tenant.db_name, tenant.db_user, tenant.db_password, {
    host:    tenant.db_host || '127.0.0.1',
    port:    parseInt(tenant.db_port || '3306'),
    dialect: 'mysql',
    logging: false,
  });

  try {
    await seq.authenticate();

    // 1a. ADD due_date to purchases
    if (await columnExists(seq, 'purchases', 'due_date')) {
      skip('purchases.due_date already exists');
    } else if (isDry) {
      ok('[dry] Would add purchases.due_date');
    } else {
      await seq.query('ALTER TABLE `purchases` ADD COLUMN `due_date` DATE DEFAULT NULL');
      ok('Added purchases.due_date');
    }

    // 1b. ADD payable_balance to suppliers
    if (await columnExists(seq, 'suppliers', 'payable_balance')) {
      skip('suppliers.payable_balance already exists');
    } else if (isDry) {
      ok('[dry] Would add suppliers.payable_balance');
    } else {
      await seq.query(
        `ALTER TABLE \`suppliers\`
         ADD COLUMN \`payable_balance\` DECIMAL(10,2) NOT NULL DEFAULT 0`
      );
      ok('Added suppliers.payable_balance');
    }

    // 2. CREATE supplier_payments table
    if (await tableExists(seq, 'supplier_payments')) {
      skip('supplier_payments table already exists');
    } else if (isDry) {
      ok('[dry] Would create supplier_payments table');
    } else {
      await seq.query(`
        CREATE TABLE \`supplier_payments\` (
          \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`ref_no\`      VARCHAR(191)    DEFAULT NULL,
          \`supplier_id\` BIGINT UNSIGNED NOT NULL,
          \`user_id\`     BIGINT UNSIGNED NOT NULL,
          \`amount\`      DECIMAL(10,2)   NOT NULL,
          \`note\`        VARCHAR(191)    DEFAULT NULL,
          \`created_at\`  DATETIME        NOT NULL,
          \`updated_at\`  DATETIME        NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`supplier_payments_ref_no_unique\` (\`ref_no\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      ok('Created supplier_payments table');
    }

    // 3. INSERT supplier_credit feature
    const [[{ cnt }]] = await seq.query(
      `SELECT COUNT(*) AS cnt FROM \`features\` WHERE \`key\` = 'supplier_credit'`
    );
    if (cnt > 0) {
      skip("feature 'supplier_credit' already exists");
    } else if (isDry) {
      ok("[dry] Would insert feature 'supplier_credit'");
    } else {
      await seq.query(
        `INSERT INTO \`features\` (\`key\`, \`label\`, \`path\`, \`group\`, \`sort_order\`, \`icon\`, \`offline_ok\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [FEATURE.key, FEATURE.label, FEATURE.path, FEATURE.group, FEATURE.sort_order, FEATURE.icon, FEATURE.offline_ok ? 1 : 0] }
      );
      ok("Inserted feature 'supplier_credit'");
    }

  } catch (e) {
    fail(`Error: ${e.message}`);
  } finally {
    await seq.close();
  }
}

async function main() {
  console.log(`\n\x1b[1m── Supplier Credit Migration${isDry ? ' [DRY RUN]' : ''} ──\x1b[0m\n`);

  // Connect to master DB and load all active tenants
  const master = new Sequelize(
    process.env.MASTER_DB_NAME || 'pos_master',
    process.env.MASTER_DB_USER || 'root',
    process.env.MASTER_DB_PASS || 'root',
    {
      host:    process.env.MASTER_DB_HOST || '127.0.0.1',
      port:    parseInt(process.env.MASTER_DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false,
    }
  );

  let tenants;
  try {
    await master.authenticate();
    const [rows] = await master.query(
      `SELECT hostname, db_name, db_user, db_password, db_host, db_port
       FROM tenants WHERE active = 1 ORDER BY hostname`
    );
    tenants = rows;
    console.log(`Found ${tenants.length} active tenant(s)\n`);
  } catch (e) {
    fail(`Cannot connect to master DB: ${e.message}`);
    process.exit(1);
  } finally {
    await master.close();
  }

  let passed = 0;
  let failed = 0;

  for (const tenant of tenants) {
    info(`Tenant: ${tenant.hostname}  →  ${tenant.db_name}`);
    try {
      await migrateTenant(tenant);
      passed++;
    } catch {
      failed++;
    }
  }

  console.log(`\n\x1b[1mDone.\x1b[0m  ${passed} succeeded, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main();
