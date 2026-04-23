-- Нормализация статусов курсов: только published/archived
-- Дата создания: 2026-04-23

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig021;
CREATE PROCEDURE _mig021()
BEGIN
  UPDATE courses
  SET status = 'published',
      version = CASE WHEN COALESCE(version, 0) < 1 THEN 1 ELSE version END,
      published_at = COALESCE(published_at, UTC_TIMESTAMP()),
      updated_at = UTC_TIMESTAMP()
  WHERE status NOT IN ('published', 'archived');

  ALTER TABLE courses
    MODIFY status ENUM('published', 'archived') NOT NULL DEFAULT 'published';
END;

CALL _mig021();
DROP PROCEDURE IF EXISTS _mig021;

SET FOREIGN_KEY_CHECKS = 1;
