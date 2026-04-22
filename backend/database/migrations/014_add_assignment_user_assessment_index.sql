-- Phase 4.1: Composite index for reverse lookup by user then assessment
-- Совместимо с MySQL, где нет IF NOT EXISTS для ADD INDEX
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'assessment_user_assignments'
    AND index_name = 'idx_assignments_user_assessment'
);

SET @idx_sql := IF(
  @idx_exists = 0,
  'ALTER TABLE assessment_user_assignments ADD INDEX idx_assignments_user_assessment (user_id, assessment_id)',
  'SELECT 1'
);

PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;
