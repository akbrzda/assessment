CREATE TABLE IF NOT EXISTS user_login_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'success',
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_login_history_user_created (user_id, created_at DESC),
  KEY idx_user_login_history_created (created_at DESC),
  CONSTRAINT fk_user_login_history_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
