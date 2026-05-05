-- Таблица истории уведомлений бота
CREATE TABLE IF NOT EXISTS bot_notifications (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  type            ENUM(
                    'onboarding',
                    'new_course',
                    'course_reminder',
                    'deadline_reminder',
                    'deadline_missed',
                    'result_passed',
                    'result_failed',
                    'certificate_ready'
                  ) NOT NULL,
  entity_type     ENUM('course', 'assessment', 'certificate') NULL,
  entity_id       INT UNSIGNED NULL,
  status          ENUM('pending', 'sent', 'failed', 'blocked', 'skipped') NOT NULL DEFAULT 'pending',
  attempt_count   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL,
  sent_at         DATETIME NULL,
  error_message   VARCHAR(500) NULL,
  payload         JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type_entity (user_id, type, entity_type, entity_id),
  INDEX idx_status_created (status, created_at)
);
