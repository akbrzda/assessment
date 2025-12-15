-- Расширение таблиц для управления геймификацией

-- Добавить поля для управления уровнями
ALTER TABLE gamification_levels
ADD COLUMN description TEXT DEFAULT NULL AFTER name,
ADD COLUMN color VARCHAR(7) DEFAULT '#6366F1' AFTER description,
ADD COLUMN icon_url VARCHAR(255) DEFAULT NULL AFTER color,
ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER icon_url,
ADD COLUMN sort_order INT UNSIGNED DEFAULT 0 AFTER is_active;

-- Добавить поля для расширенного управления бейджами
ALTER TABLE badges
ADD COLUMN color VARCHAR(7) DEFAULT '#10B981' AFTER description,
ADD COLUMN icon_url VARCHAR(255) DEFAULT NULL AFTER icon,
ADD COLUMN condition_type ENUM('manual', 'perfect_score', 'speed', 'score_threshold', 'all_tests', 'streak', 'top_rank', 'custom') DEFAULT 'manual' AFTER icon_url,
ADD COLUMN condition_data JSON DEFAULT NULL AFTER condition_type,
ADD COLUMN points_reward INT DEFAULT 0 AFTER condition_data,
ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER points_reward,
ADD COLUMN sort_order INT UNSIGNED DEFAULT 0 AFTER is_active;

-- Обновить существующие записи с условиями
UPDATE badges SET 
  condition_type = 'perfect_score',
  condition_data = JSON_OBJECT('required_score', 100)
WHERE code = 'perfect_run';

UPDATE badges SET 
  condition_type = 'speed',
  condition_data = JSON_OBJECT('max_time_percent', 40)
WHERE code = 'speedster';

UPDATE badges SET 
  condition_type = 'score_threshold',
  condition_data = JSON_OBJECT('min_score', 90)
WHERE code = 'competence_90';

UPDATE badges SET 
  condition_type = 'all_tests',
  condition_data = JSON_OBJECT('period', 'assessment')
WHERE code = 'all_tests_completed';

UPDATE badges SET 
  condition_type = 'top_rank',
  condition_data = JSON_OBJECT('scope', 'position', 'rank', 1)
WHERE code = 'position_champion';

UPDATE badges SET 
  condition_type = 'top_rank',
  condition_data = JSON_OBJECT('scope', 'monthly', 'rank', 3)
WHERE code = 'monthly_top3';

UPDATE badges SET 
  condition_type = 'streak',
  condition_data = JSON_OBJECT('min_streak', 5)
WHERE code = 'streak_master';

-- Создать таблицу для истории настроек (версионирование)
CREATE TABLE IF NOT EXISTS settings_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(128) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INT UNSIGNED NOT NULL,
  change_description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_settings_history_key (setting_key),
  INDEX idx_settings_history_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Создать таблицу для истории геймификации (уровни/бейджи)
CREATE TABLE IF NOT EXISTS gamification_config_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('level', 'badge') NOT NULL,
  entity_id INT UNSIGNED NOT NULL,
  action ENUM('create', 'update', 'delete') NOT NULL,
  old_data JSON DEFAULT NULL,
  new_data JSON DEFAULT NULL,
  changed_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gamification_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_gamification_history_entity (entity_type, entity_id),
  INDEX idx_gamification_history_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Добавить настройки для геймификации
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('GAMIFICATION_ENABLED', 'true', 'Включить систему геймификации'),
  ('POINTS_PER_CORRECT_ANSWER', '10', 'Очков за правильный ответ'),
  ('POINTS_PER_ASSESSMENT_COMPLETE', '50', 'Очков за завершение аттестации'),
  ('POINTS_PERFECT_SCORE_BONUS', '100', 'Бонус за идеальный результат (100%)'),
  ('POINTS_SPEED_BONUS', '25', 'Бонус за быстрое прохождение')
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  description = VALUES(description);
