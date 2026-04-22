-- Фаза 4.3: серверный признак завершения онбординга сотрудника
SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'onboarding_completed_at'
);

SET @alter_sql := IF(
  @column_exists = 0,
  'ALTER TABLE users ADD COLUMN onboarding_completed_at DATETIME NULL AFTER timezone',
  'SELECT 1'
);

PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;
