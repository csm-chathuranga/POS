CREATE TABLE IF NOT EXISTS `supplier_returns` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `srn_no`      VARCHAR(191)    NOT NULL,
  `supplier_id` BIGINT UNSIGNED NULL,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `return_type` ENUM('damaged','expired','other') NOT NULL DEFAULT 'other',
  `notes`       TEXT            NULL,
  `total`       DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_returns_srn_no_unique` (`srn_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `supplier_return_items` (
  `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `supplier_return_id` BIGINT UNSIGNED NOT NULL,
  `product_id`         BIGINT UNSIGNED NOT NULL,
  `product_name`       VARCHAR(191)    NOT NULL,
  `qty`                DECIMAL(12, 3)  NOT NULL,
  `cost_price`         DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  `total`              DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `sri_supplier_return_id` (`supplier_return_id`),
  CONSTRAINT `fk_sri_supplier_return` FOREIGN KEY (`supplier_return_id`) REFERENCES `supplier_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `features` (`key`, `label`, `path`, `group`, `sort_order`, `icon`, `offline_ok`)
VALUES ('supplier_returns', 'සැපයුම්කරු ආපසු', '/supplier-returns', 'main', 55, 'purchases', 0);
