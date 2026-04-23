-- Добавление инфраструктуры модуля курсов
-- Дата создания: 2026-04-11

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('published','archived') NOT NULL DEFAULT 'published',
  final_assessment_id INT UNSIGNED,
  created_by INT UNSIGNED,
  updated_by INT UNSIGNED,
  published_at DATETIME,
  archived_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courses_status (status),
  INDEX idx_courses_final_assessment (final_assessment_id),
  INDEX idx_courses_created_by (created_by),
  FOREIGN KEY (final_assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_modules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content LONGTEXT,
  order_index INT UNSIGNED NOT NULL,
  assessment_id INT UNSIGNED,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  estimated_minutes INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_course_module_order (course_id, order_index),
  INDEX idx_course_modules_course (course_id),
  INDEX idx_course_modules_assessment (assessment_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_user_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  completed_modules_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_modules_count INT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  last_activity_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_course_user_progress (course_id, user_id),
  INDEX idx_course_user_progress_user_status (user_id, status),
  INDEX idx_course_user_progress_course_status (course_id, status),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_module_user_progress (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  module_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','passed','failed') NOT NULL DEFAULT 'not_started',
  last_attempt_id INT UNSIGNED,
  best_score_percent DECIMAL(5,2),
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_course_module_user (module_id, user_id),
  INDEX idx_module_user_progress_course_user (course_id, user_id),
  INDEX idx_module_user_progress_status (status),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (last_attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('COURSES_ENABLED', 'false', 'Включить модуль курсов'),
  ('COURSES_ENABLED_BRANCH_IDS', '', 'Список филиалов для доступа к курсам через запятую'),
  ('COURSES_ENABLED_POSITION_IDS', '', 'Список должностей для доступа к курсам через запятую')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description);

INSERT INTO system_modules (code, name, description, is_active) VALUES
  ('courses', 'Курсы', 'Модуль управления курсами', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active);
