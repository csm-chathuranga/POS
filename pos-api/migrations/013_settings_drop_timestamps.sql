-- Settings table was created by Sequelize sync with timestamp columns that
-- have no DEFAULT value. Since the model now uses timestamps:false, drop them.

ALTER TABLE `settings`
  MODIFY COLUMN `created_at` DATETIME NULL DEFAULT NULL,
  MODIFY COLUMN `updated_at` DATETIME NULL DEFAULT NULL;
