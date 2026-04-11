-- Добавление версионирования курсов и snapshot для стабильного прохождения
-- Дата создания: 2026-04-11

SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE courses
  ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 0 AFTER status;

CREATE TABLE IF NOT EXISTS course_user_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  course_version INT UNSIGNED NOT NULL,
  snapshot_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_course_user_snapshot (course_id, user_id),
  INDEX idx_course_user_snapshot_user (user_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
