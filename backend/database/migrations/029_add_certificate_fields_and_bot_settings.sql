-- Поля сертификатов в таблице courses
SET @col_cert := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'courses' AND column_name = 'certificate_enabled'
);
SET @sql_cert := IF(
  @col_cert = 0,
  'ALTER TABLE courses ADD COLUMN certificate_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER final_assessment_id',
  'SELECT 1'
);
PREPARE s FROM @sql_cert; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_tmpl := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'courses' AND column_name = 'certificate_template'
);
SET @sql_tmpl := IF(
  @col_tmpl = 0,
  'ALTER TABLE courses ADD COLUMN certificate_template VARCHAR(255) NULL AFTER certificate_enabled',
  'SELECT 1'
);
PREPARE s FROM @sql_tmpl; EXECUTE s; DEALLOCATE PREPARE s;

-- Системные настройки бота
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
  ('BOT_ONBOARDING_ENABLED',       'true', 'Включить приветственный онбординг в боте'),
  ('BOT_NOTIFICATION_QUIET_START', '22:00', 'Начало тихого времени (по умолчанию, HH:MM)'),
  ('BOT_NOTIFICATION_QUIET_END',   '09:00', 'Конец тихого времени (по умолчанию, HH:MM)'),
  ('BOT_REMINDER_DAYS_INACTIVE',   '3',    'Дней неактивности по курсу до первого напоминания'),
  ('BOT_REMINDER_MAX_COUNT',       '3',    'Максимальное число напоминаний на курс без дедлайна');
