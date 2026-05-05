-- Таблица сертификатов о прохождении курсов
CREATE TABLE IF NOT EXISTS certificates (
  id           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  uuid         CHAR(36)         NOT NULL,
  user_id      INT UNSIGNED     NOT NULL,
  course_id    INT UNSIGNED     NOT NULL,
  attempt_id   INT UNSIGNED     NULL,
  status       ENUM('pending','issued','generation_failed','revoked') NOT NULL DEFAULT 'pending',
  issued_at    DATETIME         NULL,
  revoked_at   DATETIME         NULL,
  revoked_by   INT UNSIGNED     NULL,
  file_path    VARCHAR(500)     NULL,
  file_url     VARCHAR(500)     NULL,
  score_percent DECIMAL(5,2)   NULL,
  snapshot_data JSON            NULL     COMMENT 'ФИО, курс, дата — снимок на момент выдачи',
  created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_certificates_uuid (uuid),
  UNIQUE KEY uq_certificates_user_course (user_id, course_id),
  KEY idx_certificates_status (status),
  KEY idx_certificates_user_id (user_id),
  KEY idx_certificates_course_id (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
