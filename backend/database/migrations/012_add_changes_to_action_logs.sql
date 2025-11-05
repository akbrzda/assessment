-- Миграция: Добавление поля changes в action_logs
-- Дата: 2025-10-22

-- Проверка и добавление столбца changes
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = DATABASE() AND table_name = 'action_logs' AND column_name = 'changes';

SET @query = IF(@col_exists = 0, 
  'ALTER TABLE action_logs ADD COLUMN changes JSON DEFAULT NULL COMMENT ''Старые и новые значения полей (для UPDATE операций)'' AFTER description',
  'SELECT ''Column changes already exists'' AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
