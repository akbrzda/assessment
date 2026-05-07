SET @has_expires_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'expires_at'
);

SET @add_expires_at := IF(
  @has_expires_at = 0,
  'ALTER TABLE certificates ADD COLUMN expires_at DATETIME NULL AFTER issued_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_expires_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE certificates
SET expires_at = DATE_ADD(issued_at, INTERVAL 365 DAY)
WHERE status = 'issued' AND issued_at IS NOT NULL AND expires_at IS NULL;

SET @has_validity_setting := (
  SELECT COUNT(*)
  FROM system_settings
  WHERE setting_key = 'CERTIFICATE_VALIDITY_DAYS'
);

INSERT INTO system_settings (setting_key, setting_value, description)
SELECT 'CERTIFICATE_VALIDITY_DAYS', '365', 'Срок действия сертификата в днях'
WHERE @has_validity_setting = 0;

SET @has_grace_setting := (
  SELECT COUNT(*)
  FROM system_settings
  WHERE setting_key = 'CERTIFICATE_GRACE_DAYS'
);

INSERT INTO system_settings (setting_key, setting_value, description)
SELECT 'CERTIFICATE_GRACE_DAYS', '0', 'Льготный период после истечения сертификата в днях'
WHERE @has_grace_setting = 0;

SET @has_requalification_requested_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'requalification_requested_at'
);
SET @add_requalification_requested_at := IF(
  @has_requalification_requested_at = 0,
  'ALTER TABLE certificates ADD COLUMN requalification_requested_at DATETIME NULL AFTER revoked_by',
  'SELECT 1'
);
PREPARE stmt FROM @add_requalification_requested_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_requalification_requested_by := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'requalification_requested_by'
);
SET @add_requalification_requested_by := IF(
  @has_requalification_requested_by = 0,
  'ALTER TABLE certificates ADD COLUMN requalification_requested_by INT UNSIGNED NULL AFTER requalification_requested_at',
  'SELECT 1'
);
PREPARE stmt FROM @add_requalification_requested_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_requalification_reason := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'requalification_reason'
);
SET @add_requalification_reason := IF(
  @has_requalification_reason = 0,
  'ALTER TABLE certificates ADD COLUMN requalification_reason VARCHAR(255) NULL AFTER requalification_requested_by',
  'SELECT 1'
);
PREPARE stmt FROM @add_requalification_reason;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_requalification_comment := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'requalification_comment'
);
SET @add_requalification_comment := IF(
  @has_requalification_comment = 0,
  'ALTER TABLE certificates ADD COLUMN requalification_comment TEXT NULL AFTER requalification_reason',
  'SELECT 1'
);
PREPARE stmt FROM @add_requalification_comment;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
