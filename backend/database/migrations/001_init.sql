-- Оптимизированная инициализация схемы БД assessment
-- Дата оптимизации: 2025-12-25

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- СПРАВОЧНЫЕ ТАБЛИЦЫ
-- ================================================================

-- Роли пользователей
CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Филиалы
CREATE TABLE IF NOT EXISTS branches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  city VARCHAR(64),
  is_visible_in_miniapp TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Должности
CREATE TABLE IF NOT EXISTS positions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  is_visible_in_miniapp TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- ПОЛЬЗОВАТЕЛИ
-- ================================================================

-- Основная таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(32) NOT NULL UNIQUE,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(512),
  position_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  level TINYINT UNSIGNED NOT NULL DEFAULT 1,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  login VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_position (position_id),
  INDEX idx_branch (branch_id),
  INDEX idx_role (role_id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Менеджеры филиалов
CREATE TABLE IF NOT EXISTS branch_managers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_branch_manager (branch_id, user_id),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- СИСТЕМНЫЕ НАСТРОЙКИ
-- ================================================================

-- Системные настройки
CREATE TABLE IF NOT EXISTS system_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Системные модули для управления правами доступа
CREATE TABLE IF NOT EXISTS system_modules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Права доступа пользователей к модулям
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  module_id INT UNSIGNED NOT NULL,
  has_access TINYINT(1) NOT NULL DEFAULT 1,
  granted_by INT UNSIGNED,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_module (user_id, module_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- ПРИГЛАШЕНИЯ
-- ================================================================

-- Приглашения для регистрации
CREATE TABLE IF NOT EXISTS invitations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  role_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_by INT UNSIGNED,
  used_at DATETIME,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expires (expires_at),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (used_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- АТТЕСТАЦИИ
-- ================================================================

-- Основная таблица аттестаций
CREATE TABLE IF NOT EXISTS assessments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  open_at DATETIME NOT NULL,
  close_at DATETIME NOT NULL,
  time_limit_minutes INT UNSIGNED NOT NULL,
  pass_score_percent TINYINT UNSIGNED NOT NULL,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 1,
  current_theory_version_id INT UNSIGNED,
  created_by INT UNSIGNED NOT NULL,
  updated_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dates (open_at, close_at),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Вопросы аттестации
CREATE TABLE IF NOT EXISTS assessment_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('single','multiple','text') NOT NULL DEFAULT 'single',
  correct_text_answer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assessment (assessment_id, order_index),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Варианты ответов на вопросы
CREATE TABLE IF NOT EXISTS assessment_question_options (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL,
  option_text VARCHAR(512) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_question (question_id, order_index),
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Назначения аттестации пользователям
CREATE TABLE IF NOT EXISTS assessment_user_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_assessment_user (assessment_id, user_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Назначения аттестации по должностям
CREATE TABLE IF NOT EXISTS assessment_position_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  position_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_assessment_position (assessment_id, position_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Назначения аттестации по филиалам
CREATE TABLE IF NOT EXISTS assessment_branch_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  branch_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_assessment_branch (assessment_id, branch_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Попытки прохождения аттестации
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  attempt_number TINYINT UNSIGNED NOT NULL,
  status ENUM('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
  score_percent DECIMAL(5,2),
  correct_answers INT UNSIGNED,
  total_questions INT UNSIGNED,
  time_spent_seconds INT UNSIGNED,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_attempt (assessment_id, user_id, attempt_number),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ответы на вопросы в попытке
CREATE TABLE IF NOT EXISTS assessment_answers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  option_id INT UNSIGNED,
  selected_option_ids JSON,
  text_answer TEXT,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_attempt_question (attempt_id, question_id),
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES assessment_question_options(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Порядок вопросов в попытке (для фиксации рандомизации)
CREATE TABLE IF NOT EXISTS assessment_attempt_question_order (
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  display_order INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_id, question_id),
  INDEX idx_order (attempt_id, display_order),
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Порядок вариантов ответов в попытке (для фиксации рандомизации)
CREATE TABLE IF NOT EXISTS assessment_attempt_option_order (
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  option_id INT UNSIGNED NOT NULL,
  display_order INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_id, question_id, option_id),
  INDEX idx_order (attempt_id, question_id, display_order),
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES assessment_question_options(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- ТЕОРИЯ К АТТЕСТАЦИЯМ
-- ================================================================

-- Версии теории к аттестации
CREATE TABLE IF NOT EXISTS assessment_theory_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  completion_required TINYINT(1) NOT NULL DEFAULT 0,
  required_block_count INT UNSIGNED NOT NULL DEFAULT 0,
  optional_block_count INT UNSIGNED NOT NULL DEFAULT 0,
  metadata JSON,
  published_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_version (assessment_id, version_number),
  INDEX idx_status (assessment_id, status),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Блоки теории
CREATE TABLE IF NOT EXISTS assessment_theory_blocks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version_id INT UNSIGNED NOT NULL,
  order_index INT UNSIGNED NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  block_type VARCHAR(32) NOT NULL,
  content TEXT,
  video_url VARCHAR(512),
  external_url VARCHAR(512),
  metadata JSON,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_version (version_id, order_index),
  INDEX idx_required (version_id, is_required),
  FOREIGN KEY (version_id) REFERENCES assessment_theory_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Прохождения теории пользователями
CREATE TABLE IF NOT EXISTS assessment_theory_completions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  version_id INT UNSIGNED NOT NULL,
  time_spent_seconds INT UNSIGNED DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  client_payload JSON,
  UNIQUE KEY uniq_completion (assessment_id, user_id, version_id),
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES assessment_theory_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Добавляем внешний ключ к текущей версии теории в assessments
ALTER TABLE assessments
  ADD CONSTRAINT fk_current_theory_version
    FOREIGN KEY (current_theory_version_id) REFERENCES assessment_theory_versions(id)
    ON DELETE SET NULL;

-- ================================================================
-- БАНК ВОПРОСОВ
-- ================================================================

-- Категории вопросов
CREATE TABLE IF NOT EXISTS question_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Банк вопросов
CREATE TABLE IF NOT EXISTS question_bank (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED,
  question_text TEXT NOT NULL,
  question_type ENUM('single','multiple','text') NOT NULL DEFAULT 'single',
  correct_text_answer TEXT,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_type (question_type),
  FOREIGN KEY (category_id) REFERENCES question_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Варианты ответов в банке вопросов
CREATE TABLE IF NOT EXISTS question_bank_options (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  question_id INT UNSIGNED NOT NULL,
  option_text VARCHAR(512) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  order_index INT DEFAULT 0,
  INDEX idx_question (question_id),
  FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- ГЕЙМИФИКАЦИЯ
-- ================================================================

-- Уровни геймификации
CREATE TABLE IF NOT EXISTS gamification_levels (
  level_number TINYINT UNSIGNED PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366F1',
  icon_url VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT UNSIGNED DEFAULT 0,
  min_points INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Бейджи
CREATE TABLE IF NOT EXISTS badges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255),
  color VARCHAR(7) DEFAULT '#10B981',
  icon VARCHAR(8),
  icon_url VARCHAR(255),
  condition_type ENUM('manual','perfect_score','speed','score_threshold','all_tests','streak','top_rank','custom') DEFAULT 'manual',
  condition_data JSON,
  points_reward INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Статистика геймификации пользователя
CREATE TABLE IF NOT EXISTS user_gamification_stats (
  user_id INT UNSIGNED PRIMARY KEY,
  current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  last_success_at DATETIME,
  last_attempt_at DATETIME,
  last_streak_award INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Бейджи пользователей
CREATE TABLE IF NOT EXISTS user_badges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  badge_id INT UNSIGNED NOT NULL,
  awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempt_id INT UNSIGNED,
  description VARCHAR(255),
  UNIQUE KEY uniq_user_badge (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- События геймификации
CREATE TABLE IF NOT EXISTS gamification_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  attempt_id INT UNSIGNED,
  event_type VARCHAR(32) NOT NULL,
  points_delta INT NOT NULL,
  description VARCHAR(255),
  branch_id INT UNSIGNED,
  position_id INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, created_at),
  INDEX idx_branch (branch_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Правила геймификации
CREATE TABLE IF NOT EXISTS gamification_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  rule_type ENUM('points','badge') NOT NULL,
  condition_json JSON NOT NULL,
  formula_json JSON NOT NULL,
  scope_json JSON,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  active_from DATETIME,
  active_to DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active, priority),
  INDEX idx_window (active_from, active_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- История изменений правил геймификации
CREATE TABLE IF NOT EXISTS gamification_rule_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(64) NOT NULL,
  action ENUM('create','update','delete') NOT NULL,
  old_data JSON,
  new_data JSON,
  changed_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (rule_code),
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- WEBAPP STORAGE
-- ================================================================

-- Хранилище данных для WebApp
CREATE TABLE IF NOT EXISTS webapp_storage (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(32) NOT NULL,
  storage_key VARCHAR(128) NOT NULL,
  storage_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_storage (telegram_id, storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ================================================================

-- Роли
INSERT INTO roles (id, name, description) VALUES
  (1, 'employee', 'Сотрудник'),
  (2, 'manager', 'Управляющий'),
  (3, 'superadmin', 'Суперадмин')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

-- Уровни геймификации
INSERT INTO gamification_levels (level_number, code, name, color, min_points) VALUES
  (1, 'novice', 'Новичок', '#6366F1', 0),
  (2, 'specialist', 'Специалист', '#6366F1', 500),
  (3, 'expert', 'Эксперт', '#6366F1', 1200),
  (4, 'leader', 'Лидер', '#6366F1', 2000),
  (5, 'master', 'Мастер', '#6366F1', 3200),
  (6, 'guru', 'Гуру', '#6366F1', 4800)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  color = VALUES(color),
  min_points = VALUES(min_points);

-- Бейджи
INSERT INTO badges (code, name, description, color, icon, condition_type, condition_data) VALUES
  ('perfect_run', 'Без ошибок', 'Пройден тест без единой ошибки', '#10B981', '✅', 'perfect_score', '{"required_score": 100}'),
  ('speedster', 'Самый быстрый', 'Прохождение быстрее 60% таймера при успехе', '#10B981', '⚡️', 'speed', '{"max_time_percent": 20}'),
  ('competence_90', 'Компетенция 90%+', 'Результат 90% и выше', '#10B981', '🎯', 'score_threshold', '{"min_score": 90}'),
  ('all_tests_completed', 'Прошел все тесты', 'Все назначенные тесты успешно завершены', '#10B981', '🏅', 'all_tests', '{"period": "assessment"}'),
  ('branch_champion', 'Лучший в филиале', 'Филиал занимает первое место в челлендже', '#10B981', '🏆', 'top_rank', '{"rank": 1, "scope": "branch"}'),
  ('position_champion', 'Лучший по должности', 'Лидер среди однофамильцев по должности', '#10B981', '👑', 'top_rank', '{"rank": 1, "scope": "position"}'),
  ('monthly_top3', 'Топ-3 месяца', 'Входит в тройку лучших по очкам за месяц', '#10B981', '🥉', 'top_rank', '{"rank": 3, "scope": "monthly"}'),
  ('streak_master', 'Серия побед', 'Серия успешных тестов без поражений', '#10B981', '🔥', 'streak', '{"min_streak": 5}')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  color = VALUES(color),
  icon = VALUES(icon),
  condition_type = VALUES(condition_type),
  condition_data = VALUES(condition_data);

-- Системные настройки
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('LOG_CHAT_ID', '-1002574847985', 'ID группы Telegram для отправки системных логов и уведомлений'),
  ('INVITE_EXPIRATION_DAYS', '31', 'Срок действия ссылок-приглашений для управляющих (в днях)'),
  ('SUPERADMIN_IDS', '5089263300', 'Telegram ID суперадминов через запятую'),
  ('GAMIFICATION_ENABLED', 'true', 'Включить систему геймификации'),
  ('BOT_USERNAME', 'learningpf_bot', 'Username Telegram бота (без @) для генерации ссылок-приглашений'),
  ('GAMIFICATION_RULES_ENABLED', 'true', 'Включить движок гибких правил геймификации')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description);

-- Правила геймификации
INSERT INTO gamification_rules (code, name, rule_type, condition_json, formula_json, priority, is_active) VALUES
  ('base_score', 'Базовые очки за % результата', 'points', '{"min_score": 0}', '{"mode": "percent_of_score", "round": "floor", "value": 1}', 10, 1),
  ('perfect_bonus', 'Бонус за идеальный результат', 'points', '{"perfect": true}', '{"mode": "fixed", "value": 40}', 20, 0),
  ('perfect_badge', 'Бейдж за идеальный результат', 'badge', '{"perfect": true}', '{"badge_code": "perfect_run"}', 21, 0),
  ('competence_bonus', 'Бонус за 90%+', 'points', '{"min_score": 90}', '{"mode": "fixed", "value": 20}', 30, 0),
  ('competence_badge', 'Бейдж за 90%+', 'badge', '{"min_score": 90}', '{"badge_code": "competence_90"}', 31, 0),
  ('speed_bonus_50', 'Бонус за скорость ≤50%', 'points', '{"passed": true, "max_time_ratio": 0.5}', '{"mode": "fixed", "value": 25}', 40, 0),
  ('speed_badge', 'Бейдж за скорость', 'badge', '{"passed": true, "max_time_ratio": 0.5}', '{"badge_code": "speedster"}', 41, 0),
  ('speed_bonus_70', 'Бонус за скорость ≤70%', 'points', '{"passed": true, "max_time_ratio": 0.7}', '{"mode": "fixed", "value": 15}', 42, 0),
  ('speed_bonus_85', 'Бонус за скорость ≤85%', 'points', '{"passed": true, "max_time_ratio": 0.85}', '{"mode": "fixed", "value": 10}', 43, 0),
  ('streak_bonus_3', 'Бонус серия ≥3', 'points', '{"passed": true, "min_streak": 3}', '{"mode": "fixed", "value": 25}', 50, 0),
  ('streak_bonus_5', 'Бонус серия ≥5', 'points', '{"passed": true, "min_streak": 5}', '{"mode": "fixed", "value": 40}', 51, 0),
  ('streak_bonus_10', 'Бонус серия ≥10', 'points', '{"passed": true, "min_streak": 10}', '{"mode": "fixed", "value": 75}', 52, 0),
  ('streak_badge', 'Бейдж за серию', 'badge', '{"passed": true, "min_streak": 5}', '{"badge_code": "streak_master"}', 53, 0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  rule_type = VALUES(rule_type),
  condition_json = VALUES(condition_json),
  formula_json = VALUES(formula_json),
  priority = VALUES(priority),
  is_active = VALUES(is_active);

-- Системные модули
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
-- Добавление поля timezone в таблицу users
-- Дата создания: 2025-12-26

ALTER TABLE users 
ADD COLUMN timezone VARCHAR(64) DEFAULT 'UTC' AFTER password;

-- Добавление индекса для ускорения поиска
CREATE INDEX idx_timezone ON users(timezone);
