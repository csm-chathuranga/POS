require('dotenv').config();
const { Sequelize } = require('sequelize');
const { getMasterDb } = require('../src/config/masterDb');
const { runMigrations } = require('../src/lib/migrationRunner');

async function main() {
  const { master, Tenant } = getMasterDb();
  await master.authenticate();

  const tenants = await Tenant.findAll({ where: { active: true } });
  console.log(`\nRunning migrations on ${tenants.length} tenant(s)...\n`);

  for (const t of tenants) {
    console.log(`→ ${t.hostname} (${t.db_name})`);
    const seq = new Sequelize(t.db_name, t.db_user, t.db_password, {
      host: t.db_host, port: t.db_port, dialect: 'mysql', logging: false,
    });
    try {
      const results = await runMigrations(seq);
      results.forEach(r => console.log(`  [${r.status}] ${r.file}${r.error ? ' — ' + r.error : ''}`));
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    } finally {
      await seq.close();
    }
  }

  await master.close();
  console.log('\nDone.\n');
}

main().catch(e => { console.error(e.message); process.exit(1); });
