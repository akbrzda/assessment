-- Добавление флагов видимости филиалов и должностей в миниапп

SET @db_name := DATABASE();

-- Добавляем колонку is_visible_in_miniapp в branches, если отсутствует
SET @branch_visibility_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'branches'
    AND COLUMN_NAME = 'is_visible_in_miniapp'
);

SET @ddl := IF(
  @branch_visibility_exists = 0,
  'ALTER TABLE branches ADD COLUMN is_visible_in_miniapp TINYINT(1) NOT NULL DEFAULT 1 AFTER city',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Добавляем колонку is_visible_in_miniapp в positions, если отсутствует
SET @position_visibility_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'positions'
    AND COLUMN_NAME = 'is_visible_in_miniapp'
);

SET @ddl := IF(
  @position_visibility_exists = 0,
  'ALTER TABLE positions ADD COLUMN is_visible_in_miniapp TINYINT(1) NOT NULL DEFAULT 1 AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
