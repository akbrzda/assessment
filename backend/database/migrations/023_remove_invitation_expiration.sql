-- Удаляем срок действия приглашений: ссылки теперь бессрочные
-- Делаем миграцию идемпотентной для окружений с отличающимся состоянием схемы

SET NAMES utf8mb4;
SET time_zone = '+00:00';

DROP PROCEDURE IF EXISTS _mig023;
CREATE PROCEDURE _mig023()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'invitations'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'invitations'
        AND index_name = 'idx_expires'
    ) THEN
      ALTER TABLE invitations DROP INDEX idx_expires;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'invitations'
        AND column_name = 'expires_at'
    ) THEN
      ALTER TABLE invitations DROP COLUMN expires_at;
    END IF;
  END IF;
END;

CALL _mig023();
DROP PROCEDURE IF EXISTS _mig023;
