-- Гибкие правила геймификации: таблицы правил и история

CREATE TABLE IF NOT EXISTS gamification_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  rule_type ENUM('points','badge') NOT NULL,
  condition_json JSON NOT NULL,
  formula_json JSON NOT NULL,
  scope_json JSON DEFAULT NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  active_from DATETIME DEFAULT NULL,
  active_to DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rules_active_priority (is_active, priority),
  INDEX idx_rules_active_window (active_from, active_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gamification_rule_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(64) NOT NULL,
  action ENUM('create','update','delete') NOT NULL,
  old_data JSON DEFAULT NULL,
  new_data JSON DEFAULT NULL,
  changed_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rule_history_code (rule_code),
  CONSTRAINT fk_rule_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Флаг включения движка правил
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('GAMIFICATION_RULES_ENABLED', 'false', 'Включить движок гибких правил геймификации')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description);

-- Начальные правила, эквивалентные текущей логике (деактивированы по умолчанию)
INSERT INTO gamification_rules (code, name, rule_type, condition_json, formula_json, scope_json, priority, is_active)
VALUES
('base_score', 'Базовые очки за % результата', 'points', JSON_OBJECT('min_score', 0), JSON_OBJECT('mode','percent_of_score','value',1,'round','floor'), NULL, 10, 0),
('perfect_bonus', 'Бонус за идеальный результат', 'points', JSON_OBJECT('perfect', true), JSON_OBJECT('mode','fixed','value',40), NULL, 20, 0),
('perfect_badge', 'Бейдж за идеальный результат', 'badge', JSON_OBJECT('perfect', true), JSON_OBJECT('badge_code','perfect_run'), NULL, 21, 0),
('competence_bonus', 'Бонус за 90%+', 'points', JSON_OBJECT('min_score', 90), JSON_OBJECT('mode','fixed','value',20), NULL, 30, 0),
('competence_badge', 'Бейдж за 90%+', 'badge', JSON_OBJECT('min_score', 90), JSON_OBJECT('badge_code','competence_90'), NULL, 31, 0),
('speed_bonus_50', 'Бонус за скорость ≤50%', 'points', JSON_OBJECT('passed', true, 'max_time_ratio', 0.5), JSON_OBJECT('mode','fixed','value',25), NULL, 40, 0),
('speed_badge', 'Бейдж за скорость', 'badge', JSON_OBJECT('passed', true, 'max_time_ratio', 0.5), JSON_OBJECT('badge_code','speedster'), NULL, 41, 0),
('speed_bonus_70', 'Бонус за скорость ≤70%', 'points', JSON_OBJECT('passed', true, 'max_time_ratio', 0.7), JSON_OBJECT('mode','fixed','value',15), NULL, 42, 0),
('speed_bonus_85', 'Бонус за скорость ≤85%', 'points', JSON_OBJECT('passed', true, 'max_time_ratio', 0.85), JSON_OBJECT('mode','fixed','value',10), NULL, 43, 0),
('streak_bonus_3', 'Бонус серия ≥3', 'points', JSON_OBJECT('min_streak', 3, 'passed', true), JSON_OBJECT('mode','fixed','value',25), NULL, 50, 0),
('streak_bonus_5', 'Бонус серия ≥5', 'points', JSON_OBJECT('min_streak', 5, 'passed', true), JSON_OBJECT('mode','fixed','value',40), NULL, 51, 0),
('streak_bonus_10', 'Бонус серия ≥10', 'points', JSON_OBJECT('min_streak', 10, 'passed', true), JSON_OBJECT('mode','fixed','value',75), NULL, 52, 0),
('streak_badge', 'Бейдж за серию', 'badge', JSON_OBJECT('min_streak', 5, 'passed', true), JSON_OBJECT('badge_code','streak_master'), NULL, 53, 0);
