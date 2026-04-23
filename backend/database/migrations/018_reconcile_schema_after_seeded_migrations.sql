-- Восстановление схемы при расхождении журнала migrations и фактической БД
-- Сценарий: миграции отмечены как выполненные, но часть таблиц/полей физически отсутствует
-- Дата создания: 2026-04-23

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig018;
CREATE PROCEDURE _mig018()
BEGIN
  DECLARE has_course_modules INT DEFAULT 0;
  DECLARE has_course_sections INT DEFAULT 0;
  DECLARE has_module_progress INT DEFAULT 0;
  DECLARE has_section_progress INT DEFAULT 0;
  DECLARE has_module_id INT DEFAULT 0;
  DECLARE has_section_id INT DEFAULT 0;
  DECLARE has_content_column INT DEFAULT 0;

  DECLARE CONTINUE HANDLER FOR 1050 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1051 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1054 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1146 BEGIN END;

  SELECT COUNT(*)
    INTO has_course_modules
    FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = 'course_modules';

  SELECT COUNT(*)
    INTO has_course_sections
    FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = 'course_sections';

  IF has_course_modules = 1 AND has_course_sections = 0 THEN
    RENAME TABLE course_modules TO course_sections;
  END IF;

  SELECT COUNT(*)
    INTO has_module_progress
    FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = 'course_module_user_progress';

  SELECT COUNT(*)
    INTO has_section_progress
    FROM information_schema.tables
   WHERE table_schema = DATABASE() AND table_name = 'course_section_user_progress';

  IF has_module_progress = 1 AND has_section_progress = 0 THEN
    RENAME TABLE course_module_user_progress TO course_section_user_progress;
  END IF;

  SELECT COUNT(*)
    INTO has_content_column
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'course_sections'
     AND column_name = 'content';

  IF has_content_column = 1 THEN
    ALTER TABLE course_sections DROP COLUMN content;
  END IF;

  SELECT COUNT(*)
    INTO has_module_id
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'course_section_user_progress'
     AND column_name = 'module_id';

  SELECT COUNT(*)
    INTO has_section_id
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name = 'course_section_user_progress'
     AND column_name = 'section_id';

  IF has_module_id = 1 AND has_section_id = 0 THEN
    ALTER TABLE course_section_user_progress
      CHANGE COLUMN module_id section_id INT UNSIGNED NOT NULL;
  END IF;

  CREATE TABLE IF NOT EXISTS course_sections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT UNSIGNED NOT NULL,
    assessment_id INT UNSIGNED,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    estimated_minutes INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_section_order (course_id, order_index),
    INDEX idx_course_sections_course (course_id),
    INDEX idx_course_sections_assessment (assessment_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS course_section_user_progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id INT UNSIGNED NOT NULL,
    section_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    status ENUM('not_started','in_progress','passed','failed') NOT NULL DEFAULT 'not_started',
    last_attempt_id INT UNSIGNED,
    best_score_percent DECIMAL(5,2),
    attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_section_user (section_id, user_id),
    INDEX idx_section_user_progress_course_user (course_id, user_id),
    INDEX idx_section_user_progress_status (status),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  ALTER TABLE course_section_user_progress
    ADD UNIQUE KEY uniq_course_section_user (section_id, user_id);
  ALTER TABLE course_section_user_progress
    ADD INDEX idx_section_user_progress_course_user (course_id, user_id);
  ALTER TABLE course_section_user_progress
    ADD INDEX idx_section_user_progress_status (status);
  ALTER TABLE course_section_user_progress DROP INDEX uniq_course_module_user;
  ALTER TABLE course_section_user_progress DROP INDEX idx_module_user_progress_course_user;
  ALTER TABLE course_section_user_progress DROP INDEX idx_module_user_progress_status;

  CREATE TABLE IF NOT EXISTS course_topics (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    section_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INT UNSIGNED NOT NULL,
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    has_material TINYINT(1) NOT NULL DEFAULT 0,
    content LONGTEXT,
    assessment_id INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_section_topic_order (section_id, order_index),
    INDEX idx_course_topics_section (section_id),
    INDEX idx_course_topics_course (course_id),
    INDEX idx_course_topics_assessment (assessment_id),
    INDEX idx_course_topics_required (is_required),
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  ALTER TABLE course_topics
    ADD COLUMN is_required TINYINT(1) NOT NULL DEFAULT 1 AFTER order_index,
    ADD INDEX idx_course_topics_required (is_required);

  CREATE TABLE IF NOT EXISTS course_topic_user_progress (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    topic_id INT UNSIGNED NOT NULL,
    section_id INT UNSIGNED NOT NULL,
    course_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    material_viewed TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('not_started','in_progress','completed','failed') NOT NULL DEFAULT 'not_started',
    last_attempt_id INT UNSIGNED,
    best_score_percent DECIMAL(5,2),
    attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    started_at DATETIME,
    last_completed_order INT UNSIGNED,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_topic_user (topic_id, user_id),
    INDEX idx_topic_user_progress_course_user (course_id, user_id),
    INDEX idx_topic_user_progress_section_user (section_id, user_id),
    INDEX idx_topic_user_progress_status (status),
    INDEX idx_ctup_started_at (started_at),
    INDEX idx_ctup_last_completed_order (last_completed_order),
    FOREIGN KEY (topic_id) REFERENCES course_topics(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  ALTER TABLE course_topic_user_progress
    ADD COLUMN started_at DATETIME NULL AFTER attempt_count,
    ADD COLUMN last_completed_order INT UNSIGNED NULL AFTER started_at,
    ADD INDEX idx_ctup_started_at (started_at),
    ADD INDEX idx_ctup_last_completed_order (last_completed_order);

  CREATE TABLE IF NOT EXISTS assessment_attempt_questions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    attempt_id INT UNSIGNED NOT NULL,
    question_id INT UNSIGNED NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_attempt_question (attempt_id, question_id),
    KEY idx_attempt_order (attempt_id, order_index),
    CONSTRAINT fk_attempt_questions_attempt
      FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE,
    CONSTRAINT fk_attempt_questions_question
      FOREIGN KEY (question_id) REFERENCES assessment_questions(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
END;

CALL _mig018();
DROP PROCEDURE IF EXISTS _mig018;

SET FOREIGN_KEY_CHECKS = 1;
