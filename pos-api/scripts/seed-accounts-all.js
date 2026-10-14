/**
 * Seed chart of accounts for ALL active tenants.
 *
 * Usage:
 *   node scripts/seed-accounts-all.js
 *
 * Safe to re-run — skips accounts that already exist (upsert on code).
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');
const getModels = require('../src/models');

// ── Chart of Accounts ────────────────────────────────────────────────────────

const ACCOUNTS = [
  // ASSETS
  { code: '1000', name: 'Current Assets',           type: 'asset' },
  { code: '1010', name: 'Cash in Hand',              type: 'asset',     parentCode: '1000' },
  { code: '1020', name: 'Bank Account',              type: 'asset',     parentCode: '1000' },
  { code: '1030', name: 'Petty Cash',                type: 'asset',     parentCode: '1000' },
  { code: '1100', name: 'Accounts Receivable',       type: 'asset',     parentCode: '1000' },
  { code: '1200', name: 'Inventory',                 type: 'asset',     parentCode: '1000' },
  { code: '1300', name: 'Prepaid Expenses',          type: 'asset',     parentCode: '1000' },
  { code: '1500', name: 'Non-Current Assets',        type: 'asset' },
  { code: '1510', name: 'Furniture & Fixtures',      type: 'asset',     parentCode: '1500' },
  { code: '1520', name: 'Equipment',                 type: 'asset',     parentCode: '1500' },
  { code: '1530', name: 'Vehicles',                  type: 'asset',     parentCode: '1500' },
  { code: '1590', name: 'Accumulated Depreciation',  type: 'asset',     parentCode: '1500' },
  // LIABILITIES
  { code: '2000', name: 'Current Liabilities',       type: 'liability' },
  { code: '2010', name: 'Accounts Payable',          type: 'liability', parentCode: '2000' },
  { code: '2020', name: 'Accrued Expenses',          type: 'liability', parentCode: '2000' },
  { code: '2030', name: 'VAT / Tax Payable',         type: 'liability', parentCode: '2000' },
  { code: '2040', name: 'Customer Deposits',         type: 'liability', parentCode: '2000' },
  { code: '2100', name: 'Short-term Loans',          type: 'liability', parentCode: '2000' },
  { code: '2500', name: 'Non-Current Liabilities',   type: 'liability' },
  { code: '2510', name: 'Long-term Loans',           type: 'liability', parentCode: '2500' },
  // EQUITY
  { code: '3000', name: "Owner's Capital",           type: 'equity' },
  { code: '3100', name: 'Retained Earnings',         type: 'equity' },
  { code: '3200', name: 'Drawings',                  type: 'equity' },
  // INCOME
  { code: '4000', name: 'Revenue',                   type: 'income' },
  { code: '4010', name: 'Sales Revenue',             type: 'income',    parentCode: '4000' },
  { code: '4020', name: 'Service Income',            type: 'income',    parentCode: '4000' },
  { code: '4030', name: 'Wholesale Revenue',         type: 'income',    parentCode: '4000' },
  { code: '4100', name: 'Other Income',              type: 'income' },
  { code: '4110', name: 'Interest Income',           type: 'income',    parentCode: '4100' },
  { code: '4120', name: 'Discount Received',         type: 'income',    parentCode: '4100' },
  // EXPENSES
  { code: '5000', name: 'Cost of Goods Sold',        type: 'expense' },
  { code: '5100', name: 'Operating Expenses',        type: 'expense' },
  { code: '5110', name: 'Salaries & Wages',          type: 'expense',   parentCode: '5100' },
  { code: '5120', name: 'Rent Expense',              type: 'expense',   parentCode: '5100' },
  { code: '5130', name: 'Electricity & Water',       type: 'expense',   parentCode: '5100' },
  { code: '5140', name: 'Telephone & Internet',      type: 'expense',   parentCode: '5100' },
  { code: '5150', name: 'Marketing & Advertising',   type: 'expense',   parentCode: '5100' },
  { code: '5160', name: 'Office Supplies',           type: 'expense',   parentCode: '5100' },
  { code: '5170', name: 'Packaging & Delivery',      type: 'expense',   parentCode: '5100' },
  { code: '5180', name: 'Repairs & Maintenance',     type: 'expense',   parentCode: '5100' },
  { code: '5190', name: 'Depreciation Expense',      type: 'expense',   parentCode: '5100' },
  { code: '5200', name: 'Financial Expenses',        type: 'expense' },
  { code: '5210', name: 'Bank Charges',              type: 'expense',   parentCode: '5200' },
  { code: '5220', name: 'Loan Interest',             type: 'expense',   parentCode: '5200' },
  { code: '5900', name: 'Miscellaneous Expenses',    type: 'expense' },
];

// ── Logging ───────────────────────────────────────────────────────────────────

const ok   = m => console.log(`  \x1b[32m✔\x1b[0m  ${m}`);
const info = m => console.log(`  \x1b[36mℹ\x1b[0m  ${m}`);
const warn = m => console.log(`  \x1b[33m⚠\x1b[0m  ${m}`);
const fail = m => console.error(`  \x1b[31m✖\x1b[0m  ${m}`);
const head = m => console.log(`\n\x1b[1m${m}\x1b[0m`);

// ── Per-tenant seeder ─────────────────────────────────────────────────────────

async function seedTenant(tenant) {
  head(`Tenant: ${tenant.hostname}  (${tenant.db_name})`);

  const sequelize = new Sequelize(tenant.db_name, tenant.db_user, tenant.db_password, {
    host:    tenant.db_host || process.env.DB_HOST || 'localhost',
    port:    parseInt(tenant.db_port || process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
    define:  { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at', underscored: true },
  });

  try {
    await sequelize.authenticate();
    const { Account } = getModels(sequelize);
    await Account.sync({ alter: true });

    // Pass 1 — insert accounts
    const codeToId = {};
    let created = 0, skipped = 0;

    for (const a of ACCOUNTS) {
      const [row, wasCreated] = await Account.findOrCreate({
        where: { code: a.code },
        defaults: { name: a.name, type: a.type, parent_id: null },
      });
      codeToId[a.code] = row.id;
      wasCreated ? created++ : skipped++;
    }

    // Pass 2 — link parents
    for (const a of ACCOUNTS) {
      if (!a.parentCode) continue;
      const parentId = codeToId[a.parentCode];
      if (!parentId) { warn(`Parent ${a.parentCode} not found for ${a.code}`); continue; }
      await Account.update({ parent_id: parentId }, { where: { code: a.code, parent_id: null } });
    }

    ok(`${created} created, ${skipped} skipped — ${await Account.count()} total accounts`);
  } catch (e) {
    fail(`Failed: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const { master, Tenant } = getMasterDb();
  await master.authenticate();

  const tenants = await Tenant.findAll({ where: { active: true }, order: [['hostname', 'ASC']] });

  if (tenants.length === 0) {
    console.log('No active tenants found.');
    process.exit(0);
  }

  console.log(`\nSeeding chart of accounts for ${tenants.length} tenant(s)…`);

  for (const t of tenants) {
    await seedTenant(t.dataValues);
  }

  console.log('\n\x1b[32mAll tenants done.\x1b[0m\n');
  await master.close();
}

run().catch(e => { console.error('\x1b[31m✖\x1b[0m', e.message); process.exit(1); });
