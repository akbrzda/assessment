-- Полная инициализация схемы и справочников БД assessment

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS assessment_answers;
DROP TABLE IF EXISTS assessment_attempts;
DROP TABLE IF EXISTS assessment_branch_assignments;
DROP TABLE IF EXISTS assessment_position_assignments;
DROP TABLE IF EXISTS assessment_question_options;
DROP TABLE IF EXISTS assessment_questions;
DROP TABLE IF EXISTS assessment_user_assignments;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS user_gamification_stats;
DROP TABLE IF EXISTS gamification_events;
DROP TABLE IF EXISTS gamification_rule_history;
DROP TABLE IF EXISTS gamification_rules;
DROP TABLE IF EXISTS question_bank_options;
DROP TABLE IF EXISTS question_bank;
DROP TABLE IF EXISTS question_categories;
DROP TABLE IF EXISTS branch_managers;
DROP TABLE IF EXISTS webapp_storage;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS gamification_levels;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- Роли
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Филиалы
CREATE TABLE branches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  city VARCHAR(64) DEFAULT NULL,
  is_visible_in_miniapp TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branches_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Должности
CREATE TABLE positions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  is_visible_in_miniapp TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_positions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Пользователи
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(32) NOT NULL,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512) DEFAULT NULL,
  position_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  login VARCHAR(100) DEFAULT NULL,
  password VARCHAR(255) DEFAULT NULL,
  refresh_token TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_telegram_id (telegram_id),
  UNIQUE KEY uq_users_login (login),
  KEY idx_users_position (position_id),
  KEY idx_users_branch (branch_id),
  KEY idx_users_role (role_id),
  CONSTRAINT fk_users_positions FOREIGN KEY (position_id) REFERENCES positions(id),
  CONSTRAINT fk_users_branches FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Менеджеры филиалов
CREATE TABLE branch_managers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_branch_manager (branch_id, user_id),
  KEY idx_branch_managers_branch (branch_id),
  KEY idx_branch_managers_user (user_id),
  CONSTRAINT fk_branch_managers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_branch_managers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Системные настройки
CREATE TABLE system_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_system_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Приглашения
CREATE TABLE invitations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(16) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED DEFAULT NULL,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_by INT UNSIGNED DEFAULT NULL,
  used_at DATETIME DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invitations_code (code),
  KEY idx_invitations_role (role_id),
  KEY idx_invitations_branch (branch_id),
  KEY idx_invitations_used_by (used_by),
  KEY idx_invitations_created_by (created_by),
  CONSTRAINT fk_inv_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_inv_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_inv_used_by FOREIGN KEY (used_by) REFERENCES users(id),
  CONSTRAINT fk_inv_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Аттестации
CREATE TABLE assessments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  open_at DATETIME NOT NULL,
  close_at DATETIME NOT NULL,
  time_limit_minutes INT UNSIGNED NOT NULL,
  pass_score_percent TINYINT UNSIGNED NOT NULL,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NOT NULL,
  updated_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_assessments_created_by (created_by),
  KEY idx_assessments_updated_by (updated_by),
  CONSTRAINT fk_assessments_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_assessments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_assessment_questions_assessment_order (assessment_id, order_index),
  CONSTRAINT fk_assessment_questions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_question_options (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL,
  option_text VARCHAR(512) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_assessment_options_question_order (question_id, order_index),
  CONSTRAINT fk_assessment_options_question FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_user_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_user (assessment_id, user_id),
  KEY idx_assessment_user_user (user_id),
  CONSTRAINT fk_assessment_user_assignment_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_user_assignment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_position_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  position_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_position (assessment_id, position_id),
  KEY idx_assessment_position_position (position_id),
  CONSTRAINT fk_assessment_position_assignment_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_position_assignment_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_branch_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_branch (assessment_id, branch_id),
  KEY idx_assessment_branch_branch (branch_id),
  CONSTRAINT fk_assessment_branch_assignment_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_branch_assignment_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  attempt_number TINYINT UNSIGNED NOT NULL,
  status ENUM('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
  score_percent DECIMAL(5,2) DEFAULT NULL,
  correct_answers INT UNSIGNED DEFAULT NULL,
  total_questions INT UNSIGNED DEFAULT NULL,
  time_spent_seconds INT UNSIGNED DEFAULT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_attempt (assessment_id, user_id, attempt_number),
  KEY idx_assessment_attempt_user (user_id),
  CONSTRAINT fk_assessment_attempt_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessment_answers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  option_id INT UNSIGNED DEFAULT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attempt_question (attempt_id, question_id),
  KEY idx_assessment_answers_question (question_id),
  KEY idx_assessment_answers_option (option_id),
  KEY idx_assessment_answers_attempt (attempt_id),
  CONSTRAINT fk_assessment_answers_attempt FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_answers_question FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_answers_option FOREIGN KEY (option_id) REFERENCES assessment_question_options(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Банк вопросов
CREATE TABLE question_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE question_bank (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED DEFAULT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('single','multiple','text') NOT NULL DEFAULT 'single' COMMENT 'Тип вопроса: single - один вариант, multiple - множественный выбор, text - текстовый ответ',
  correct_text_answer TEXT COMMENT 'Эталонный ответ для текстового типа вопроса',
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_question_bank_category (category_id),
  KEY idx_question_bank_created_by (created_by),
  KEY idx_question_type (question_type),
  CONSTRAINT fk_question_bank_category FOREIGN KEY (category_id) REFERENCES question_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_question_bank_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE question_bank_options (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  option_text VARCHAR(512) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  order_index INT DEFAULT 0,
  KEY idx_question_bank_option_question (question_id),
  CONSTRAINT fk_question_bank_options_question FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Геймификация
CREATE TABLE gamification_levels (
  level_number TINYINT UNSIGNED PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366F1',
  icon_url VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT UNSIGNED DEFAULT 0,
  min_points INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gamification_levels_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE badges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  color VARCHAR(7) DEFAULT '#10B981',
  icon VARCHAR(8) DEFAULT NULL,
  icon_url VARCHAR(255) DEFAULT NULL,
  condition_type ENUM('manual','perfect_score','speed','score_threshold','all_tests','streak','top_rank','custom') DEFAULT 'manual',
  condition_data JSON DEFAULT NULL,
  points_reward INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_badges_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_gamification_stats (
  user_id INT UNSIGNED PRIMARY KEY,
  current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  last_success_at DATETIME DEFAULT NULL,
  last_attempt_at DATETIME DEFAULT NULL,
  last_streak_award INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_gamification_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_badges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  badge_id INT UNSIGNED NOT NULL,
  awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempt_id INT UNSIGNED DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  UNIQUE KEY uq_user_badge (user_id, badge_id),
  KEY idx_user_badges_badge (badge_id),
  KEY idx_user_badges_attempt (attempt_id),
  CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_attempt FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gamification_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  attempt_id INT UNSIGNED DEFAULT NULL,
  event_type VARCHAR(32) NOT NULL,
  points_delta INT NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  branch_id INT UNSIGNED DEFAULT NULL,
  position_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gamification_events_user_created (user_id, created_at),
  KEY idx_gamification_events_attempt (attempt_id),
  KEY idx_gamification_events_branch_created (branch_id, created_at),
  KEY idx_gamification_events_position (position_id),
  CONSTRAINT fk_gamification_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_gamification_events_attempt FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  CONSTRAINT fk_gamification_events_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_gamification_events_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gamification_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  rule_type ENUM('points','badge') NOT NULL,
  condition_json JSON NOT NULL,
  formula_json JSON NOT NULL,
  scope_json JSON DEFAULT NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  active_from DATETIME DEFAULT NULL,
  active_to DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gamification_rules_code (code),
  KEY idx_rules_active_priority (is_active, priority),
  KEY idx_rules_active_window (active_from, active_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gamification_rule_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(64) NOT NULL,
  action ENUM('create','update','delete') NOT NULL,
  old_data JSON DEFAULT NULL,
  new_data JSON DEFAULT NULL,
  changed_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rule_history_code (rule_code),
  KEY idx_rule_history_user (changed_by),
  CONSTRAINT fk_rule_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Хранилище WebApp
CREATE TABLE webapp_storage (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(32) NOT NULL,
  storage_key VARCHAR(128) NOT NULL,
  storage_value TEXT NOT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_webapp_storage_user_key (telegram_id, storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Наполнение справочников
INSERT INTO roles (id, name, description) VALUES
  (1, 'employee', 'Сотрудник'),
  (2, 'manager', 'Управляющий'),
  (3, 'superadmin', 'Суперадмин')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

INSERT INTO gamification_levels (level_number, code, name, description, color, icon_url, is_active, sort_order, min_points) VALUES
  (1, 'novice', 'Новичок', NULL, '#6366F1', NULL, 1, 0, 0),
  (2, 'specialist', 'Специалист', NULL, '#6366F1', NULL, 1, 0, 500),
  (3, 'expert', 'Эксперт', NULL, '#6366F1', NULL, 1, 0, 1200),
  (4, 'leader', 'Лидер', NULL, '#6366F1', NULL, 1, 0, 2000),
  (5, 'master', 'Мастер', NULL, '#6366F1', NULL, 1, 0, 3200),
  (6, 'guru', 'Гуру', NULL, '#6366F1', NULL, 1, 6, 4800)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  color = VALUES(color),
  icon_url = VALUES(icon_url),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order),
  min_points = VALUES(min_points);

INSERT INTO badges (code, name, description, color, icon, icon_url, condition_type, condition_data, points_reward, is_active, sort_order) VALUES
  ('perfect_run', 'Без ошибок', 'Пройден тест без единой ошибки', '#10B981', '✅', NULL, 'perfect_score', '{"required_score": 100}', 0, 1, 0),
  ('speedster', 'Самый быстрый', 'Прохождение быстрее 60% таймера при успехе', '#10B981', '⚡️', NULL, 'speed', '{"max_time_percent": 20}', 0, 1, 0),
  ('competence_90', 'Компетенция 90%+', 'Результат 90% и выше', '#10B981', '🎯', NULL, 'score_threshold', '{"min_score": 90}', 0, 1, 0),
  ('all_tests_completed', 'Прошел все тесты', 'Все назначенные тесты успешно завершены', '#10B981', '🏅', NULL, 'all_tests', '{"period": "assessment"}', 0, 1, 0),
  ('branch_champion', 'Лучший в филиале', 'Филиал занимает первое место в челлендже', '#10B981', '🏆', NULL, 'top_rank', '{"rank": 1, "scope": "branch"}', 0, 1, 0),
  ('position_champion', 'Лучший по должности', 'Лидер среди однофамильцев по должности', '#10B981', '👑', NULL, 'top_rank', '{"rank": 1, "scope": "position"}', 0, 1, 0),
  ('monthly_top3', 'Топ-3 месяца', 'Входит в тройку лучших по очкам за месяц', '#10B981', '🥉', NULL, 'top_rank', '{"rank": 3, "scope": "monthly"}', 0, 1, 0),
  ('streak_master', 'Серия побед', 'Серия успешных тестов без поражений', '#10B981', '🔥', NULL, 'streak', '{"min_streak": 5}', 0, 1, 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  color = VALUES(color),
  icon = VALUES(icon),
  icon_url = VALUES(icon_url),
  condition_type = VALUES(condition_type),
  condition_data = VALUES(condition_data),
  points_reward = VALUES(points_reward),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('LOG_CHAT_ID', '-1002574847985', 'ID группы Telegram для отправки системных логов и уведомлений'),
  ('INVITE_EXPIRATION_DAYS', '31', 'Срок действия ссылок-приглашений для управляющих (в днях)'),
  ('SUPERADMIN_IDS', '5089263300', 'Telegram ID суперадминов через запятую (например: 123456,789012)'),
  ('GAMIFICATION_ENABLED', 'true', 'Включить систему геймификации'),
  ('POINTS_PER_CORRECT_ANSWER', '10', 'Очков за правильный ответ'),
  ('POINTS_PER_ASSESSMENT_COMPLETE', '50', 'Очков за завершение аттестации'),
  ('POINTS_PERFECT_SCORE_BONUS', '100', 'Бонус за идеальный результат (100%)'),
  ('POINTS_SPEED_BONUS', '25', 'Бонус за быстрое прохождение'),
  ('BOT_USERNAME', 'learningpf_bot', 'Username Telegram бота (без @) для генерации ссылок-приглашений'),
  ('GAMIFICATION_RULES_ENABLED', 'true', 'Включить движок гибких правил геймификации')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description);

INSERT INTO gamification_rules (code, name, rule_type, condition_json, formula_json, scope_json, priority, is_active) VALUES
  ('base_score', 'Базовые очки за % результата', 'points', '{"min_score": 0}', '{"mode": "percent_of_score", "round": "floor", "value": 1}', NULL, 10, 1),
  ('perfect_bonus', 'Бонус за идеальный результат', 'points', '{"perfect": true}', '{"mode": "fixed", "value": 40}', NULL, 20, 0),
  ('perfect_badge', 'Бейдж за идеальный результат', 'badge', '{"perfect": true}', '{"badge_code": "perfect_run"}', NULL, 21, 0),
  ('competence_bonus', 'Бонус за 90%+', 'points', '{"min_score": 90}', '{"mode": "fixed", "value": 20}', NULL, 30, 0),
  ('competence_badge', 'Бейдж за 90%+', 'badge', '{"min_score": 90}', '{"badge_code": "competence_90"}', NULL, 31, 0),
  ('speed_bonus_50', 'Бонус за скорость ≤50%', 'points', '{"passed": true, "max_time_ratio": 0.5}', '{"mode": "fixed", "value": 25}', NULL, 40, 0),
  ('speed_badge', 'Бейдж за скорость', 'badge', '{"passed": true, "max_time_ratio": 0.5}', '{"badge_code": "speedster"}', NULL, 41, 0),
  ('speed_bonus_70', 'Бонус за скорость ≤70%', 'points', '{"passed": true, "max_time_ratio": 0.7}', '{"mode": "fixed", "value": 15}', NULL, 42, 0),
  ('speed_bonus_85', 'Бонус за скорость ≤85%', 'points', '{"passed": true, "max_time_ratio": 0.85}', '{"mode": "fixed", "value": 10}', NULL, 43, 0),
  ('streak_bonus_3', 'Бонус серия ≥3', 'points', '{"passed": true, "min_streak": 3}', '{"mode": "fixed", "value": 25}', NULL, 50, 0),
  ('streak_bonus_5', 'Бонус серия ≥5', 'points', '{"passed": true, "min_streak": 5}', '{"mode": "fixed", "value": 40}', NULL, 51, 0),
  ('streak_bonus_10', 'Бонус серия ≥10', 'points', '{"passed": true, "min_streak": 10}', '{"mode": "fixed", "value": 75}', NULL, 52, 0),
  ('streak_badge', 'Бейдж за серию', 'badge', '{"passed": true, "min_streak": 5}', '{"badge_code": "streak_master"}', NULL, 53, 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  rule_type = VALUES(rule_type),
  condition_json = VALUES(condition_json),
  formula_json = VALUES(formula_json),
  scope_json = VALUES(scope_json),
  priority = VALUES(priority),
  is_active = VALUES(is_active);
CREATE TABLE IF NOT EXISTS assessment_theory_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  completion_required TINYINT(1) NOT NULL DEFAULT 0,
  required_block_count INT UNSIGNED NOT NULL DEFAULT 0,
  optional_block_count INT UNSIGNED NOT NULL DEFAULT 0,
  metadata JSON DEFAULT NULL,
  published_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_theory_versions_version (assessment_id, version_number),
  KEY idx_assessment_theory_versions_status (assessment_id, status),
  CONSTRAINT fk_theory_versions_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_theory_blocks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  block_type VARCHAR(32) NOT NULL,
  content TEXT DEFAULT NULL,
  video_url VARCHAR(512) DEFAULT NULL,
  external_url VARCHAR(512) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_theory_blocks_version (version_id, order_index),
  KEY idx_theory_blocks_required (version_id, is_required),
  CONSTRAINT fk_theory_blocks_version FOREIGN KEY (version_id) REFERENCES assessment_theory_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_theory_completions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  version_id INT UNSIGNED NOT NULL,
  completed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  client_payload JSON DEFAULT NULL,
  UNIQUE KEY uq_theory_completion (assessment_id, user_id, version_id),
  KEY idx_theory_completion_user (user_id),
  KEY idx_theory_completion_version (version_id),
  CONSTRAINT fk_theory_completion_assessment FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  CONSTRAINT fk_theory_completion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_theory_completion_version FOREIGN KEY (version_id) REFERENCES assessment_theory_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE assessments
  ADD COLUMN current_theory_version_id INT UNSIGNED DEFAULT NULL AFTER max_attempts,
  ADD CONSTRAINT fk_assessments_current_theory_version
    FOREIGN KEY (current_theory_version_id) REFERENCES assessment_theory_versions(id)
    ON DELETE SET NULL;
ALTER TABLE assessment_theory_completions
  ADD COLUMN time_spent_seconds INT UNSIGNED DEFAULT 0 AFTER client_payload;
ALTER TABLE assessment_questions
  ADD COLUMN question_type ENUM('single','multiple','text') NOT NULL DEFAULT 'single' AFTER question_text,
  ADD COLUMN correct_text_answer TEXT NULL AFTER question_type;

ALTER TABLE assessment_answers
  ADD COLUMN selected_option_ids JSON DEFAULT NULL AFTER option_id,
  ADD COLUMN text_answer TEXT DEFAULT NULL AFTER selected_option_ids;
-- Миграция для системы прав доступа пользователей

-- Таблица для хранения доступных модулей системы
CREATE TABLE IF NOT EXISTS system_modules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL COMMENT 'Уникальный код модуля',
  name VARCHAR(128) NOT NULL COMMENT 'Название модуля',
  description TEXT DEFAULT NULL COMMENT 'Описание модуля',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Активен ли модуль',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_system_modules_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица для хранения прав доступа пользователей к модулям
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL COMMENT 'ID пользователя',
  module_id INT UNSIGNED NOT NULL COMMENT 'ID модуля',
  has_access TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Есть ли доступ к модулю',
  granted_by INT UNSIGNED DEFAULT NULL COMMENT 'Кто выдал доступ',
  granted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Когда выдан доступ',
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_module (user_id, module_id),
  KEY idx_user_permissions_module (module_id),
  KEY idx_user_permissions_granted_by (granted_by),
  CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_module FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Заполнение справочника модулей
INSERT INTO system_modules (code, name, description, is_active) VALUES
  ('assessments', 'Аттестации', 'Модуль управления аттестациями', 1),
  ('questions', 'Банк вопросов', 'Модуль управления банком вопросов', 1),
  ('users', 'Пользователи', 'Модуль управления пользователями', 1),
  ('branches', 'Филиалы', 'Модуль управления филиалами', 1),
  ('positions', 'Должности', 'Модуль управления должностями', 1),
  ('analytics', 'Аналитика', 'Модуль аналитики и отчетов', 1),
  ('gamification', 'Геймификация', 'Модуль настройки геймификации', 1),
  ('settings', 'Настройки', 'Модуль системных настроек', 1),
  ('invitations', 'Приглашения', 'Модуль управления приглашениями пользователей', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active);
