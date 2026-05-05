-- Настройки уведомлений в таблице пользователей
SET @col_enabled := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'notifications_enabled'
);
SET @sql_enabled := IF(
  @col_enabled = 0,
  'ALTER TABLE users ADD COLUMN notifications_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER onboarding_completed_at',
  'SELECT 1'
);
PREPARE s FROM @sql_enabled; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_qs := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'notification_quiet_start'
);
SET @sql_qs := IF(
  @col_qs = 0,
  'ALTER TABLE users ADD COLUMN notification_quiet_start TIME NULL DEFAULT ''22:00:00'' AFTER notifications_enabled',
  'SELECT 1'
);
PREPARE s FROM @sql_qs; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_qe := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'notification_quiet_end'
);
SET @sql_qe := IF(
  @col_qe = 0,
  'ALTER TABLE users ADD COLUMN notification_quiet_end TIME NULL DEFAULT ''09:00:00'' AFTER notification_quiet_start',
  'SELECT 1'
);
PREPARE s FROM @sql_qe; EXECUTE s; DEALLOCATE PREPARE s;
