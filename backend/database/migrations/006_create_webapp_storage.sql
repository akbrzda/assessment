-- Telegram WebApp CloudStorage fallback table

CREATE TABLE IF NOT EXISTS webapp_storage (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(32) NOT NULL,
  storage_key VARCHAR(128) NOT NULL,
  storage_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_webapp_storage_user_key (telegram_id, storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
