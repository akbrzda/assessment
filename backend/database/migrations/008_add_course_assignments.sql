-- Система назначения курсов: по должности, филиалу и вручную
-- Дата создания: 2026-04-14

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig008;
CREATE PROCEDURE _mig008()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1050 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1061 BEGIN END;
  DECLARE CONTINUE HANDLER FOR 1146 BEGIN END;

  -- Назначение курса целевым должностям
  CREATE TABLE IF NOT EXISTS course_position_targets (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    course_id  INT UNSIGNED NOT NULL,
    position_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_course_position (course_id, position_id),
    INDEX idx_cpt_position (position_id),
    CONSTRAINT fk_cpt_course    FOREIGN KEY (course_id)   REFERENCES courses(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cpt_position  FOREIGN KEY (position_id) REFERENCES positions(id)  ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- Назначение курса целевым филиалам
  CREATE TABLE IF NOT EXISTS course_branch_targets (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    course_id  INT UNSIGNED NOT NULL,
    branch_id  INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_course_branch (course_id, branch_id),
    INDEX idx_cbt_branch (branch_id),
    CONSTRAINT fk_cbt_course   FOREIGN KEY (course_id)  REFERENCES courses(id)   ON DELETE CASCADE,
    CONSTRAINT fk_cbt_branch   FOREIGN KEY (branch_id)  REFERENCES branches(id)  ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- Ручное назначение курса конкретному пользователю
  CREATE TABLE IF NOT EXISTS course_user_assignments (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    course_id   INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED NOT NULL,
    assigned_by INT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_course_user_assignment (course_id, user_id),
    INDEX idx_cua_user (user_id),
    INDEX idx_cua_assigned_by (assigned_by),
    CONSTRAINT fk_cua_course     FOREIGN KEY (course_id)   REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cua_user       FOREIGN KEY (user_id)     REFERENCES users(id)   ON DELETE CASCADE,
    CONSTRAINT fk_cua_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)  ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

END;

CALL _mig008();
DROP PROCEDURE IF EXISTS _mig008;

SET FOREIGN_KEY_CHECKS = 1;
