-- Режимы срока действия курсов и статус закрытия пользователя
-- Дата создания: 2026-04-21

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig010;
CREATE PROCEDURE _mig010()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1146 BEGIN END;

  -- Настройки срока действия курса
  ALTER TABLE courses
    ADD COLUMN availability_mode ENUM('unlimited','relative_days','fixed_dates') NOT NULL DEFAULT 'unlimited' AFTER description,
    ADD COLUMN availability_days SMALLINT UNSIGNED NULL AFTER availability_mode,
    ADD COLUMN availability_from DATETIME NULL AFTER availability_days,
    ADD COLUMN availability_to DATETIME NULL AFTER availability_from;

  -- Индивидуальные атрибуты назначения и дедлайна пользователя
  ALTER TABLE course_user_progress
    MODIFY COLUMN status ENUM('not_started','in_progress','completed','closed') NOT NULL DEFAULT 'not_started',
    ADD COLUMN assigned_at DATETIME NULL AFTER user_id,
    ADD COLUMN deadline_at DATETIME NULL AFTER assigned_at,
    ADD COLUMN closed_at DATETIME NULL AFTER completed_at,
    ADD COLUMN closed_by INT UNSIGNED NULL AFTER closed_at,
    ADD INDEX idx_cup_deadline (deadline_at),
    ADD INDEX idx_cup_closed_by (closed_by),
    ADD CONSTRAINT fk_cup_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL;

  -- Дополнительные признаки для ручного назначения
  ALTER TABLE course_user_assignments
    ADD COLUMN status ENUM('active','closed') NOT NULL DEFAULT 'active' AFTER assigned_at,
    ADD COLUMN deadline_at DATETIME NULL AFTER status,
    ADD COLUMN closed_at DATETIME NULL AFTER deadline_at,
    ADD COLUMN closed_by INT UNSIGNED NULL AFTER closed_at,
    ADD INDEX idx_cua_status (status),
    ADD INDEX idx_cua_closed_by (closed_by),
    ADD CONSTRAINT fk_cua_closed_by FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL;
END;

CALL _mig010();
DROP PROCEDURE IF EXISTS _mig010;

SET FOREIGN_KEY_CHECKS = 1;
