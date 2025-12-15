-- Миграция: Создание таблицы user_notifications
-- Дата: 2024-11-06

CREATE TABLE IF NOT EXISTS user_notifications (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  chat_id BIGINT NULL,
  template_key VARCHAR(100) NULL,
  locale VARCHAR(8) DEFAULT 'ru',
  title VARCHAR(255) NULL,
  message TEXT NOT NULL,
  status ENUM('queued', 'sent', 'failed') DEFAULT 'queued',
  retry_count TINYINT UNSIGNED DEFAULT 0,
  last_error TEXT NULL,
  event_id VARCHAR(191) NULL,
  channel VARCHAR(32) DEFAULT 'telegram',
  metadata JSON NULL,
  scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_notifications_user_id (user_id),
  INDEX idx_user_notifications_event_id (event_id),
  INDEX idx_user_notifications_status (status),
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
