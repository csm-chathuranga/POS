-- Fix supplier_returns feature label from Sinhala to English
UPDATE `features` SET `label` = 'Supplier Returns' WHERE `key` = 'supplier_returns';
