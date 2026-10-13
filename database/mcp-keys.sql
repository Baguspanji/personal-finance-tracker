-- =============================================================================
-- MCP Access Keys (additive — tidak menyentuh tabel lain)
-- Berbeda dengan database/schema.sql, file ini TIDAK DROP tabel apa pun.
-- Jalankan ulang kapan saja: aman karena memakai IF NOT EXISTS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `mcp_keys` (
  `id` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  -- sha256 dari key plaintext. Key plaintext hanya ditampilkan sekali saat dibuat.
  `key_hash` CHAR(64) NOT NULL,
  `last_used_at` DATETIME NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mcp_keys_hash` (`key_hash`),
  INDEX `idx_mcp_keys_user` (`user_id`),
  CONSTRAINT `fk_mcp_keys_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;