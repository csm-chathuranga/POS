// Creates van-sales tables in the tenant DB. Safe to re-run.
async function ensureVanSalesTables(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`van_trips\` (
      \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`driver_name\` VARCHAR(191)    NOT NULL DEFAULT '',
      \`vehicle_no\`  VARCHAR(100)    NOT NULL DEFAULT '',
      \`start_date\`  DATE            NOT NULL,
      \`end_date\`    DATE            NULL,
      \`status\`      ENUM('active','closed') NOT NULL DEFAULT 'active',
      \`notes\`       TEXT            NULL,
      \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`van_loads\` (
      \`id\`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`trip_id\`  BIGINT UNSIGNED NOT NULL,
      \`date\`     DATE            NOT NULL,
      \`type\`     ENUM('initial','refill') NOT NULL DEFAULT 'initial',
      \`notes\`    TEXT            NULL,
      \`created_at\` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`idx_van_loads_trip\` (\`trip_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`van_load_items\` (
      \`id\`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`load_id\`      BIGINT UNSIGNED NOT NULL,
      \`variant_name\` VARCHAR(191)    NOT NULL,
      \`quantity\`     INT UNSIGNED    NOT NULL DEFAULT 0,
      \`unit_price\`   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
      \`unit_cost\`    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
      KEY \`idx_van_load_items_load\` (\`load_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`van_daily_records\` (
      \`id\`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`trip_id\`       BIGINT UNSIGNED NOT NULL,
      \`date\`          DATE            NOT NULL,
      \`advance_given\` DECIMAL(10,2)   NOT NULL DEFAULT 5000.00,
      \`cash_handover\` DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
      \`notes\`         TEXT            NULL,
      \`created_at\`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`uq_van_daily_trip_date\` (\`trip_id\`, \`date\`),
      KEY \`idx_van_daily_trip\` (\`trip_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`van_unload_items\` (
      \`id\`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`trip_id\`      BIGINT UNSIGNED NOT NULL,
      \`date\`         DATE            NOT NULL,
      \`variant_name\` VARCHAR(191)    NOT NULL,
      \`qty_returned\` INT UNSIGNED    NOT NULL DEFAULT 0,
      \`qty_damaged\`  INT UNSIGNED    NOT NULL DEFAULT 0,
      KEY \`idx_van_unload_trip\` (\`trip_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  // Add qty_damaged to existing tables that were created before this column (compatible with MySQL 5.7+)
  const [[{ cnt }]] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'van_unload_items'
       AND COLUMN_NAME  = 'qty_damaged'`
  );
  if (!Number(cnt)) {
    await sequelize.query(
      `ALTER TABLE \`van_unload_items\` ADD COLUMN \`qty_damaged\` INT UNSIGNED NOT NULL DEFAULT 0`
    );
  }
}

module.exports = { ensureVanSalesTables };
