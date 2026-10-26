/**
 * Create attendance tables and columns for a tenant.
 * Usage: node scripts/migrate-attendance.js <hostname|all>
 * Safe to re-run.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');
const { ensureAttendanceTables } = require('../src/lib/attendance');

async function migrateTenant(row) {
  console.log(`Tenant: ${row.hostname} (${row.db_name})`);
  const sequelize = new Sequelize(row.db_name, row.db_user, row.db_password, {
    host:    row.db_host || process.env.DB_HOST || 'localhost',
    port:    parseInt(row.db_port || process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
  });
  try {
    await sequelize.authenticate();
    await ensureAttendanceTables(sequelize);
    console.log('  attendance tables ready');
  } catch (e) {
    console.error(`  ${row.hostname}: ${e.message}`);
  } finally {
    await sequelize.close();
  }
}

async function run() {
  const arg = process.argv[2];
  if (!arg) { console.error('Usage: node scripts/migrate-attendance.js <hostname|all>'); process.exit(1); }
  const { master, Tenant } = getMasterDb();
  await master.authenticate();
  let tenants;
  if (arg === 'all') {
    tenants = await Tenant.findAll({ where: { active: true }, order: [['hostname', 'ASC']] });
  } else {
    const t = await Tenant.findOne({ where: { hostname: arg, active: true } });
    if (!t) { console.error(`Tenant "${arg}" not found`); process.exit(1); }
    tenants = [t];
  }
  for (const t of tenants) await migrateTenant(t.dataValues);
  await master.close();
}
run().catch(e => { console.error(e.message); process.exit(1); });
