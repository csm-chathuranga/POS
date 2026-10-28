ALTER TABLE purchase_items ADD COLUMN free_qty      DECIMAL(10,3) NOT NULL DEFAULT 0   AFTER qty;
ALTER TABLE purchase_items ADD COLUMN selling_price DECIMAL(10,2) NOT NULL DEFAULT 0   AFTER cost_price;
