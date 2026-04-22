-- Phase 3.1: Performance indexes
-- Composite index on assessment_attempts (assessment_id, user_id) for fast lookup
ALTER TABLE assessment_attempts
  ADD INDEX IF NOT EXISTS idx_attempts_assessment_user (assessment_id, user_id);

-- Index on assessment_user_assignments (user_id) for fast reverse lookup
ALTER TABLE assessment_user_assignments
  ADD INDEX IF NOT EXISTS idx_assignments_user_id (user_id);

-- Index on users (branch_id) for branch filtering queries
ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_branch_id (branch_id);
