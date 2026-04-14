-- Рефакторинг иерархии курсов: Модуль → Раздел (Section) + Тема (Topic)
-- До: Курс → Модуль (course_modules)
-- После: Курс → Раздел (course_sections) → Тема (course_topics)
-- Дата создания: 2026-04-14

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================================
-- 1. Идемпотентные DDL-операции через хранимую процедуру
--    Коды MySQL, которые пропускаем:
--    1050 — Table already exists (RENAME destination уже существует)
--    1051 — Unknown table (RENAME source уже переименован)
--    1054 — Unknown column (CHANGE уже выполнен)
--    1060 — Duplicate column name (ADD COLUMN уже выполнен)
--    1061 — Duplicate key name (ADD INDEX уже выполнен)
--    1091 — Can't DROP — key/column doesn't exist
--    1146 — Table doesn't exist (RENAME source не существует)
-- ====================================================================

DROP PROCEDURE IF EXISTS _mig007;
CREATE PROCEDURE _mig007()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1050 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1051 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1054 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1146 BEGIN END;

  RENAME TABLE course_modules TO course_sections;
  ALTER TABLE course_sections DROP COLUMN content;

  RENAME TABLE course_module_user_progress TO course_section_user_progress;
  ALTER TABLE course_section_user_progress
    CHANGE COLUMN module_id section_id INT UNSIGNED NOT NULL;

  -- Добавляем новые индексы ДО удаления старых,
  -- чтобы FK-ограничения на section_id не остались без покрытия
  ALTER TABLE course_section_user_progress
    ADD UNIQUE KEY uniq_course_section_user (section_id, user_id);
  ALTER TABLE course_section_user_progress
    ADD INDEX idx_section_user_progress_course_user (course_id, user_id);
  ALTER TABLE course_section_user_progress
    ADD INDEX idx_section_user_progress_status (status);

  -- Теперь удаляем старые именованные индексы (FK покрыт новым uniq)
  ALTER TABLE course_section_user_progress DROP INDEX uniq_course_module_user;
  ALTER TABLE course_section_user_progress DROP INDEX idx_module_user_progress_course_user;
  ALTER TABLE course_section_user_progress DROP INDEX idx_module_user_progress_status;
END;
CALL _mig007();
DROP PROCEDURE IF EXISTS _mig007;

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- 2. Создание таблицы тем (course_topics)
-- ====================================================================

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

-- ====================================================================
-- 3. Создание таблицы прогресса пользователя по темам
-- ====================================================================

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
