// Creates the Coop City tables in a tenant DB. Safe to re-run.
async function ensureCoopTables(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`coop_stores\` (
      \`id\`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`name\`       VARCHAR(191)    NOT NULL,
      \`active\`     TINYINT(1)      NOT NULL DEFAULT 1,
      \`created_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`coop_stock_transfers\` (
      \`id\`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`transfer_no\`   VARCHAR(50)     NOT NULL UNIQUE,
      \`date\`          DATE            NOT NULL,
      \`from_store_id\` BIGINT UNSIGNED NOT NULL,
      \`to_store_id\`   BIGINT UNSIGNED NOT NULL,
      \`total_cost\`    DECIMAL(12,2)   NOT NULL DEFAULT 0,
      \`total_selling\` DECIMAL(12,2)   NOT NULL DEFAULT 0,
      \`remarks\`       TEXT            NULL,
      \`prepared_by\`   VARCHAR(191)    NULL,
      \`checked_by\`    VARCHAR(191)    NULL,
      \`issued_by\`     VARCHAR(191)    NULL,
      \`received_by\`   VARCHAR(191)    NULL,
      \`created_by\`    BIGINT UNSIGNED NULL,
      \`created_at\`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`coop_stock_transfer_items\` (
      \`id\`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`transfer_id\`   BIGINT UNSIGNED NOT NULL,
      \`product_id\`    BIGINT UNSIGNED NOT NULL,
      \`product_name\`  VARCHAR(191)    NOT NULL,
      \`qty\`           DECIMAL(10,3)   NOT NULL,
      \`cost_price\`    DECIMAL(10,2)   NOT NULL DEFAULT 0,
      \`selling_price\` DECIMAL(10,2)   NOT NULL DEFAULT 0,
      \`cost_total\`    DECIMAL(12,2)   NOT NULL DEFAULT 0,
      \`selling_total\` DECIMAL(12,2)   NOT NULL DEFAULT 0,
      \`created_at\`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY \`idx_transfer\` (\`transfer_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

module.exports = { ensureCoopTables };
