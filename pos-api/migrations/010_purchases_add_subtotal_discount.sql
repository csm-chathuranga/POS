-- purchases: add subtotal and discount columns
ALTER TABLE purchases ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER note;
ALTER TABLE purchases ADD COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER subtotal;

-- back-fill subtotal = total for existing rows (discount was 0 before this feature)
UPDATE purchases SET subtotal = total WHERE subtotal = 0;
