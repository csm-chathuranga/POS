ALTER TABLE `supplier_returns`
  ADD COLUMN `purchase_id` BIGINT UNSIGNED NULL AFTER `srn_no`,
  ADD KEY `sr_purchase_id` (`purchase_id`);
