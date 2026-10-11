-- products
ALTER TABLE products ADD COLUMN name_si VARCHAR(191) NULL AFTER name;
ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER selling_price;
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
