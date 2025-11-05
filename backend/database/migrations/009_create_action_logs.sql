-- Миграция: Создание таблицы логов действий
-- Дата: 2024

CREATE TABLE IF NOT EXISTS action_logs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  admin_id INT UNSIGNED NOT NULL,
  admin_username VARCHAR(255),
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id (admin_id),
  INDEX idx_action_type (action_type),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
