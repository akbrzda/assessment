-- Таблица событий курсов для аналитики
CREATE TABLE IF NOT EXISTS course_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  user_id   INT UNSIGNED NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),

  INDEX idx_ce_course_id  (course_id),
  INDEX idx_ce_user_id    (user_id),
  INDEX idx_ce_event_type (event_type),
  INDEX idx_ce_created_at (created_at),

  CONSTRAINT fk_ce_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_ce_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
