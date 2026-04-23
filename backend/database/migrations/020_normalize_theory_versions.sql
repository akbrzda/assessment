-- Удаление неподдерживаемых версий теории
-- Дата создания: 2026-04-23

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS _mig020;
CREATE PROCEDURE _mig020()
BEGIN
  -- Если в текущей теории у аттестации стоит неподдерживаемая версия,
  -- переключаем на последнюю опубликованную версию или NULL.
  UPDATE assessments a
  LEFT JOIN assessment_theory_versions cur ON cur.id = a.current_theory_version_id
  SET a.current_theory_version_id = (
    SELECT v.id
    FROM assessment_theory_versions v
    WHERE v.assessment_id = a.id
      AND v.status = 'published'
    ORDER BY v.version_number DESC, v.id DESC
    LIMIT 1
  )
  WHERE a.current_theory_version_id IS NOT NULL
    AND cur.status <> 'published';

  DELETE b
  FROM assessment_theory_blocks b
  INNER JOIN assessment_theory_versions v ON v.id = b.version_id
  WHERE v.status <> 'published';

  DELETE FROM assessment_theory_versions
  WHERE status <> 'published';

  ALTER TABLE assessment_theory_versions
    MODIFY status ENUM('published') NOT NULL DEFAULT 'published';
END;

CALL _mig020();
DROP PROCEDURE IF EXISTS _mig020;

SET FOREIGN_KEY_CHECKS = 1;
