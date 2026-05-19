SET @has_users_phone_e164 := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'phone_e164'
);
SET @add_users_phone_e164 := IF(
  @has_users_phone_e164 = 0,
  'ALTER TABLE users ADD COLUMN phone_e164 VARCHAR(16) NULL AFTER telegram_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_users_phone_e164;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_phone_verification_status := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'phone_verification_status'
);
SET @add_users_phone_verification_status := IF(
  @has_users_phone_verification_status = 0,
  "ALTER TABLE users ADD COLUMN phone_verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified' AFTER phone_e164",
  'SELECT 1'
);
PREPARE stmt FROM @add_users_phone_verification_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_phone_verified_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'phone_verified_at'
);
SET @add_users_phone_verified_at := IF(
  @has_users_phone_verified_at = 0,
  'ALTER TABLE users ADD COLUMN phone_verified_at DATETIME NULL AFTER phone_verification_status',
  'SELECT 1'
);
PREPARE stmt FROM @add_users_phone_verified_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_phone_verification_source := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'phone_verification_source'
);
SET @add_users_phone_verification_source := IF(
  @has_users_phone_verification_source = 0,
  "ALTER TABLE users ADD COLUMN phone_verification_source ENUM('telegram_contact','max_contact','admin','migration','unknown') NULL AFTER phone_verified_at",
  'SELECT 1'
);
PREPARE stmt FROM @add_users_phone_verification_source;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_phone_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_phone_e164'
);
SET @add_users_phone_index := IF(
  @has_users_phone_index = 0,
  'CREATE INDEX idx_users_phone_e164 ON users (phone_e164)',
  'SELECT 1'
);
PREPARE stmt FROM @add_users_phone_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_invitations_phone_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'invitations' AND index_name = 'idx_invitations_phone'
);
SET @add_invitations_phone_index := IF(
  @has_invitations_phone_index = 0,
  'CREATE INDEX idx_invitations_phone ON invitations (phone)',
  'SELECT 1'
);
PREPARE stmt FROM @add_invitations_phone_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_platform_identity_table := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'user_platform_identities'
);
SET @create_platform_identity_table := IF(
  @has_platform_identity_table = 0,
  "CREATE TABLE user_platform_identities (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  user_id INT UNSIGNED NOT NULL,\n  platform ENUM('telegram','max') NOT NULL,\n  platform_user_id VARCHAR(128) NOT NULL,\n  platform_username VARCHAR(128) NULL,\n  is_verified TINYINT(1) NOT NULL DEFAULT 0,\n  verified_at DATETIME NULL,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (id),\n  UNIQUE KEY uniq_platform_platform_user_id (platform, platform_user_id),\n  UNIQUE KEY uniq_platform_user_platform (user_id, platform),\n  KEY idx_platform_user_id (user_id),\n  CONSTRAINT fk_platform_identity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n)",
  'SELECT 1'
);
PREPARE stmt FROM @create_platform_identity_table;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO user_platform_identities (user_id, platform, platform_user_id, is_verified, verified_at)
SELECT u.id, 'telegram', u.telegram_id, 1, NOW()
FROM users u
WHERE u.telegram_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM user_platform_identities upi
    WHERE upi.user_id = u.id AND upi.platform = 'telegram'
  );

UPDATE users u
INNER JOIN invitations i ON i.invited_user_id = u.id
SET u.phone_e164 = i.phone,
    u.phone_verification_status = CASE
      WHEN u.phone_verification_status = 'verified' THEN 'verified'
      ELSE 'pending'
    END
WHERE u.phone_e164 IS NULL
  AND i.phone IS NOT NULL
  AND i.phone <> '';
