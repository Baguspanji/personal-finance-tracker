-- =============================================================================
-- MySQL Database Seeder for Personal Finance Tracker
-- =============================================================================

USE `personal_finance`;

-- Disable Foreign Key Checks during seeding
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `transactions`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `payment_methods`;
TRUNCATE TABLE `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Seeder: Users (Default Demo Account - Password: password123)
-- Hash generated using bcrypt algorithm
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `created_at`, `updated_at`) VALUES
('usr_1', 'Pengguna Utama', 'user@finance.com', '$2a$10$q2Iu7kGfH2k2zP2KzI4x4e6/V3D7A4W9f8S9D0F1G2H3J4K5L6M7N', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- Seeder: Payment Methods
-- -----------------------------------------------------------------------------
INSERT INTO `payment_methods` (`id`, `name`, `created_at`, `updated_at`) VALUES
('pm_1', 'Tunai', NOW(), NOW()),
('pm_2', 'Transfer', NOW(), NOW()),
('pm_3', 'QRIS', NOW(), NOW()),
('pm_4', 'E-Wallet', NOW(), NOW()),
('pm_5', 'Debit', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- Seeder: Categories (Income & Expense)
-- -----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `type`, `created_at`, `updated_at`) VALUES
-- Income Categories
('cat_inc_1', 'Gaji', 'income', NOW(), NOW()),
('cat_inc_2', 'Bonus', 'income', NOW(), NOW()),
('cat_inc_3', 'Freelance', 'income', NOW(), NOW()),
('cat_inc_4', 'Investasi', 'income', NOW(), NOW()),
('cat_inc_5', 'Lainnya', 'income', NOW(), NOW()),

-- Expense Categories
('cat_exp_1', 'Makanan', 'expense', NOW(), NOW()),
('cat_exp_2', 'Transportasi', 'expense', NOW(), NOW()),
('cat_exp_3', 'Belanja', 'expense', NOW(), NOW()),
('cat_exp_4', 'Tagihan', 'expense', NOW(), NOW()),
('cat_exp_5', 'Hiburan', 'expense', NOW(), NOW()),
('cat_exp_6', 'Kesehatan', 'expense', NOW(), NOW()),
('cat_exp_7', 'Pendidikan', 'expense', NOW(), NOW()),
('cat_exp_8', 'Lainnya', 'expense', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- Seeder: Initial Transactions
-- -----------------------------------------------------------------------------
INSERT INTO `transactions` (`id`, `category_id`, `payment_method_id`, `transaction_type`, `amount`, `transaction_date`, `notes`, `created_at`, `updated_at`) VALUES
('tx_1', 'cat_inc_1', 'pm_2', 'income', 8500000.00, CURDATE() - INTERVAL 28 DAY, 'Gaji Bulanan Utama', NOW(), NOW()),
('tx_2', 'cat_exp_1', 'pm_3', 'expense', 45000.00, CURDATE() - INTERVAL 25 DAY, 'Makan siang Nasi Padang', NOW(), NOW()),
('tx_3', 'cat_exp_2', 'pm_4', 'expense', 150000.00, CURDATE() - INTERVAL 20 DAY, 'Topup saldo e-toll & ojek online', NOW(), NOW()),
('tx_4', 'cat_exp_4', 'pm_2', 'expense', 350000.00, CURDATE() - INTERVAL 15 DAY, 'Tagihan Listrik & WiFi', NOW(), NOW()),
('tx_5', 'cat_inc_3', 'pm_2', 'income', 1200000.00, CURDATE() - INTERVAL 10 DAY, 'Project Web Design Freelance', NOW(), NOW()),
('tx_6', 'cat_exp_3', 'pm_5', 'expense', 250000.00, CURDATE() - INTERVAL 2 DAY, 'Belanja Bulanan Minimarket', NOW(), NOW());
