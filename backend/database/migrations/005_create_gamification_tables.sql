-- Геймификация: уровни, бейджи и события (этап 6)

CREATE TABLE IF NOT EXISTS gamification_levels (
  level_number TINYINT UNSIGNED PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  min_points INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO gamification_levels (level_number, code, name, min_points) VALUES
  (1, 'novice', 'Новичок', 0),
  (2, 'specialist', 'Специалист', 500),
  (3, 'expert', 'Эксперт', 1200),
  (4, 'leader', 'Лидер', 2000),
  (5, 'master', 'Мастер', 3200),
  (6, 'guru', 'Гуру', 4800)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  min_points = VALUES(min_points);

CREATE TABLE IF NOT EXISTS badges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  icon VARCHAR(8) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO badges (code, name, description, icon) VALUES
  ('perfect_run', 'Без ошибок', 'Пройден тест без единой ошибки', '✅'),
  ('speedster', 'Самый быстрый', 'Прохождение быстрее 60% таймера при успехе', '⚡️'),
  ('competence_90', 'Компетенция 90%+', 'Результат 90% и выше', '🎯'),
  ('all_tests_completed', 'Прошел все тесты', 'Все назначенные тесты успешно завершены', '🏅'),
  ('position_champion', 'Лучший по должности', 'Лидер среди однофамильцев по должности', '👑'),
  ('monthly_top3', 'Топ-3 месяца', 'Входит в тройку лучших по очкам за месяц', '🥉'),
  ('streak_master', 'Серия побед', 'Серия успешных тестов без поражений', '🔥')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  icon = VALUES(icon);

CREATE TABLE IF NOT EXISTS user_badges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  badge_id INT UNSIGNED NOT NULL,
  awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempt_id INT UNSIGNED DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  UNIQUE KEY uniq_user_badge (user_id, badge_id),
  CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_attempt FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_gamification_stats (
  user_id INT UNSIGNED PRIMARY KEY,
  current_streak INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak INT UNSIGNED NOT NULL DEFAULT 0,
  last_success_at DATETIME DEFAULT NULL,
  last_attempt_at DATETIME DEFAULT NULL,
  last_streak_award INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_gamification_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gamification_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  attempt_id INT UNSIGNED DEFAULT NULL,
  event_type VARCHAR(32) NOT NULL,
  points_delta INT NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  branch_id INT UNSIGNED DEFAULT NULL,
  position_id INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gamification_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_gamification_events_attempt FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL,
  CONSTRAINT fk_gamification_events_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  CONSTRAINT fk_gamification_events_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  INDEX idx_gamification_events_user_created_at (user_id, created_at),
  INDEX idx_gamification_events_attempt (attempt_id),
  INDEX idx_gamification_events_branch_created_at (branch_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
