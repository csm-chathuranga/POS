-- Add hourly_rate calculation method and hourly_rate column to employees
ALTER TABLE `employees` MODIFY COLUMN `salary_calculation` ENUM('daily_rate','deduction','manual','hourly_rate') NOT NULL DEFAULT 'manual';
ALTER TABLE `employees` ADD COLUMN `hourly_rate` DECIMAL(10,2) NOT NULL DEFAULT 150.00 AFTER `salary_calculation`;
