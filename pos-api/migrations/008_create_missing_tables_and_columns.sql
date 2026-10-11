-- Create tables that may not exist in older tenant databases

CREATE TABLE IF NOT EXISTS product_variants (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id        BIGINT UNSIGNED NOT NULL,
  label             VARCHAR(191) NOT NULL,
  barcode           VARCHAR(191) NULL,
  cost_price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
  wholesale_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_qty         DECIMAL(10,3) NOT NULL DEFAULT 0,
  alert_qty         DECIMAL(10,3) NOT NULL DEFAULT 5,
  conversion_factor DECIMAL(10,6) NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ref_no      VARCHAR(191) NULL UNIQUE,
  supplier_id BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  note        VARCHAR(191) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_returns (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sale_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  return_no  VARCHAR(191) NOT NULL UNIQUE,
  reason     TEXT NULL,
  total      DECIMAL(12,2) NOT NULL DEFAULT 0,
  items      JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sr_sale FOREIGN KEY (sale_id) REFERENCES sales(id),
  CONSTRAINT fk_sr_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id   BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  type         ENUM('in','out','adjustment','return') NOT NULL,
  qty          DECIMAL(10,3) NOT NULL,
  stock_before DECIMAL(10,3) NOT NULL,
  stock_after  DECIMAL(10,3) NOT NULL,
  reference    VARCHAR(191) NULL,
  note         TEXT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sm_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_sm_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS credit_payments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_no  VARCHAR(191) NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  note        VARCHAR(191) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cp_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add missing columns (skipped automatically if already exist)

-- products
ALTER TABLE products ADD COLUMN name_si VARCHAR(191) NULL AFTER name;
ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN promo_price DECIMAL(10,2) NULL;
ALTER TABLE products ADD COLUMN promo_start_date DATE NULL;
ALTER TABLE products ADD COLUMN promo_end_date DATE NULL;
ALTER TABLE products ADD COLUMN our_price DECIMAL(10,2) NULL;
ALTER TABLE products ADD COLUMN is_fast_moving TINYINT(1) NOT NULL DEFAULT 0;

-- product_variants
ALTER TABLE product_variants ADD COLUMN wholesale_price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN conversion_factor DECIMAL(10,6) NOT NULL DEFAULT 1;

-- sales
ALTER TABLE sales ADD COLUMN client_id VARCHAR(50) NULL UNIQUE;
ALTER TABLE sales ADD COLUMN extra_charges DECIMAL(10,2) NOT NULL DEFAULT 0;

-- sale_items
ALTER TABLE sale_items ADD COLUMN variant_id BIGINT UNSIGNED NULL;
ALTER TABLE sale_items ADD COLUMN original_price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN cost_price DECIMAL(10,2) NOT NULL DEFAULT 0;

-- purchases
ALTER TABLE purchases ADD COLUMN paid DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN status ENUM('received','pending','partial') NOT NULL DEFAULT 'received';

-- supplier_payments
ALTER TABLE supplier_payments ADD COLUMN ref_no VARCHAR(191) NULL UNIQUE;

-- credit_payments
ALTER TABLE credit_payments ADD COLUMN invoice_no VARCHAR(191) NULL UNIQUE;
