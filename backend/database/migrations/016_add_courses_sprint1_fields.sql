-- Sprint 1: дополнительные поля для курсов и прогресса подтем
-- Дата создания: 2026-04-22

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig016;
CREATE PROCEDURE _mig016()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1146 BEGIN END;

  ALTER TABLE courses
    ADD COLUMN cover_url VARCHAR(1024) NULL AFTER description,
    ADD COLUMN category VARCHAR(128) NULL AFTER cover_url,
    ADD COLUMN tags JSON NULL AFTER category;

  ALTER TABLE course_topic_user_progress
    ADD COLUMN started_at DATETIME NULL AFTER attempt_count,
    ADD COLUMN last_completed_order INT UNSIGNED NULL AFTER started_at,
    ADD INDEX idx_ctup_started_at (started_at),
    ADD INDEX idx_ctup_last_completed_order (last_completed_order);

  CREATE TABLE IF NOT EXISTS course_drafts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    draft_payload JSON NOT NULL,
    version_label VARCHAR(64) NULL,
    created_by INT UNSIGNED NOT NULL,
    updated_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_drafts_course (course_id),
    INDEX idx_course_drafts_updated_at (updated_at),
    CONSTRAINT fk_course_drafts_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_drafts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_course_drafts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
END;

CALL _mig016();
DROP PROCEDURE IF EXISTS _mig016;

SET FOREIGN_KEY_CHECKS = 1;
