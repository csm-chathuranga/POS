async function ensureAttendanceTables(sequelize) {
  // Add device_employee_id and salary_calculation to employees (idempotent)
  for (const sql of [
    `ALTER TABLE \`employees\` ADD COLUMN \`device_employee_id\` VARCHAR(50) NULL AFTER \`hired_date\``,
    `ALTER TABLE \`employees\` ADD COLUMN \`salary_calculation\` ENUM('daily_rate','deduction','manual') NOT NULL DEFAULT 'manual' AFTER \`device_employee_id\``,
  ]) {
    try { await sequelize.query(sql); }
    catch (e) { if (!e.message.includes('Duplicate column name') && !e.message.includes('already exists')) throw e; }
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`attendance_settings\` (
      \`id\`                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`device_ip\`         VARCHAR(100)     NOT NULL DEFAULT '',
      \`port\`              SMALLINT UNSIGNED NOT NULL DEFAULT 80,
      \`username\`          VARCHAR(100)     NOT NULL DEFAULT 'admin',
      \`password\`          VARCHAR(191)     NOT NULL DEFAULT '',
      \`poll_interval_min\` TINYINT UNSIGNED NOT NULL DEFAULT 5,
      \`enabled\`           TINYINT(1)       NOT NULL DEFAULT 0,
      \`last_synced_at\`    DATETIME         NULL,
      \`created_at\`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`attendance_records\` (
      \`id\`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`employee_id\` BIGINT UNSIGNED NOT NULL,
      \`punch_time\`  DATETIME        NOT NULL,
      \`direction\`   ENUM('in','out','unknown') NOT NULL DEFAULT 'unknown',
      \`event_id\`    VARCHAR(64)     NULL,
      \`source\`      ENUM('device','manual')   NOT NULL DEFAULT 'device',
      \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`uq_event\` (\`event_id\`),
      KEY \`idx_emp_punch\` (\`employee_id\`, \`punch_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function ensureCashAdvanceTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`cash_advances\` (
      \`id\`                 BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`employee_id\`        BIGINT UNSIGNED  NOT NULL,
      \`amount\`             DECIMAL(10,2)    NOT NULL,
      \`note\`               VARCHAR(255)     NULL,
      \`given_date\`         DATE             NOT NULL,
      \`deducted\`           TINYINT(1)       NOT NULL DEFAULT 0,
      \`salary_payment_id\`  BIGINT UNSIGNED  NULL,
      \`given_by\`           BIGINT UNSIGNED  NULL,
      \`created_at\`         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`idx_emp\` (\`employee_id\`),
      KEY \`idx_pending\` (\`employee_id\`, \`deducted\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

module.exports = { ensureAttendanceTables, ensureCashAdvanceTable };
