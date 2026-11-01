-- Settings and features tables were created by Sequelize sync with timestamp
-- columns that have no DEFAULT value. Make them nullable so upserts don't fail.

ALTER TABLE `settings`
  MODIFY COLUMN `created_at` DATETIME NULL DEFAULT NULL,
  MODIFY COLUMN `updated_at` DATETIME NULL DEFAULT NULL;

ALTER TABLE `features`
  MODIFY COLUMN `created_at` DATETIME NULL DEFAULT NULL,
  MODIFY COLUMN `updated_at` DATETIME NULL DEFAULT NULL;
