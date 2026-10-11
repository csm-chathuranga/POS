/**
 * Targeted migration: product batches feature
 *
 * Applies to ALL active tenants from the master DB:
 *   1. CREATE TABLE product_batches (if absent)
 *
 * Usage:
 *   node scripts/add-product-batches.js
 *   node scripts/add-product-batches.js --dry-run   (preview only, no changes)
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const isDry = process.argv.includes('--dry-run');

const ok   = m => console.log(`  \x1b[32m✔\x1b[0m  ${m}`);
const skip = m => console.log(`  \x1b[33m–\x1b[0m  ${m}`);
const fail = m => console.log(`  \x1b[31m✖\x1b[0m  ${m}`);
const info = m => console.log(`\n\x1b[1m${m}\x1b[0m`);

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

    if (await tableExists(seq, 'product_batches')) {
      skip('product_batches table already exists');
    } else if (isDry) {
      ok('[dry] Would create product_batches table');
    } else {
      await seq.query(`
        CREATE TABLE \`product_batches\` (
          \`id\`            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
          \`product_id\`    BIGINT UNSIGNED  NOT NULL,
          \`batch_label\`   VARCHAR(100)     DEFAULT NULL,
          \`qty\`           DECIMAL(10,3)    NOT NULL DEFAULT 0,
          \`cost_price\`    DECIMAL(10,2)    NOT NULL DEFAULT 0,
          \`selling_price\` DECIMAL(10,2)    NOT NULL DEFAULT 0,
          \`expiry_date\`   DATE             DEFAULT NULL,
          \`received_at\`   DATE             NOT NULL,
          \`created_at\`    DATETIME         NOT NULL,
          \`updated_at\`    DATETIME         NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`product_batches_product_id\` (\`product_id\`),
          KEY \`product_batches_received_at\` (\`received_at\`),
          CONSTRAINT \`product_batches_product_fk\`
            FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      ok('Created product_batches table');
    }

  } catch (e) {
    fail(`Error: ${e.message}`);
  } finally {
    await seq.close();
  }
}

async function main() {
  console.log(`\n\x1b[1m── Product Batches Migration${isDry ? ' [DRY RUN]' : ''} ──\x1b[0m\n`);

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
