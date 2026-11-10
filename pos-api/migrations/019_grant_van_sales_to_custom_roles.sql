-- Grant van_sales feature to the Custom role
INSERT IGNORE INTO `role_features` (`role_id`, `feature_id`)
SELECT r.id, f.id
FROM `roles` r
CROSS JOIN `features` f
WHERE r.name = 'custom'
  AND f.key = 'van_sales';
