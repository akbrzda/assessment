-- Phase 3.1: Performance indexes
-- Совместимо с MySQL без поддержки IF NOT EXISTS для индексов

SET @db_name = DATABASE();

-- Composite index on assessment_attempts (assessment_id, user_id) for fast lookup
SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'assessment_attempts'
    AND index_name = 'idx_attempts_assessment_user'
);
SET @sql_stmt = IF(
  @idx_exists = 0,
  'ALTER TABLE assessment_attempts ADD INDEX idx_attempts_assessment_user (assessment_id, user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on assessment_user_assignments (user_id) for fast reverse lookup
SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'assessment_user_assignments'
    AND index_name = 'idx_assignments_user_id'
);
SET @sql_stmt = IF(
  @idx_exists = 0,
  'ALTER TABLE assessment_user_assignments ADD INDEX idx_assignments_user_id (user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on users (branch_id) for branch filtering queries
SET @idx_exists = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND index_name = 'idx_users_branch_id'
);
SET @sql_stmt = IF(
  @idx_exists = 0,
  'ALTER TABLE users ADD INDEX idx_users_branch_id (branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
