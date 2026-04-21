-- Выравнивание иерархии курсов после некорректно отмеченной миграции 007
-- Сценарий: 007 отмечена в журнале, но таблицы course_sections/* фактически не созданы
-- Дата создания: 2026-04-21

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig011;
CREATE PROCEDURE _mig011()
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
    has_material TINYINT(1) NOT NULL DEFAULT 0,
    content LONGTEXT,
    assessment_id INT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_section_topic_order (section_id, order_index),
    INDEX idx_course_topics_section (section_id),
    INDEX idx_course_topics_course (course_id),
    INDEX idx_course_topics_assessment (assessment_id),
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_course_topic_user (topic_id, user_id),
    INDEX idx_topic_user_progress_course_user (course_id, user_id),
    INDEX idx_topic_user_progress_section_user (section_id, user_id),
    INDEX idx_topic_user_progress_status (status),
    FOREIGN KEY (topic_id) REFERENCES course_topics(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
END;

CALL _mig011();
DROP PROCEDURE IF EXISTS _mig011;

SET FOREIGN_KEY_CHECKS = 1;
