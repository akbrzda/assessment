-- Добавление поля city в таблицу branches и создание таблицы branch_managers

SET @db_name := DATABASE();

-- Добавляем колонку city в branches, если отсутствует
SET @city_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'branches'
    AND COLUMN_NAME = 'city'
);

SET @ddl := IF(
  @city_exists = 0,
  'ALTER TABLE branches ADD COLUMN city VARCHAR(255) DEFAULT NULL AFTER name',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Создаем таблицу связи филиалов и управляющих, если она еще не создана
CREATE TABLE IF NOT EXISTS branch_managers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_branch_managers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_branch_managers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_branch_manager (branch_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Индекс по branch_id, если отсутствует
SET @branch_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'branch_managers'
    AND INDEX_NAME = 'idx_branch_managers_branch'
);

SET @ddl := IF(
  @branch_idx_exists = 0,
  'CREATE INDEX idx_branch_managers_branch ON branch_managers(branch_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Индекс по user_id, если отсутствует
SET @user_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'branch_managers'
    AND INDEX_NAME = 'idx_branch_managers_user'
);

SET @ddl := IF(
  @user_idx_exists = 0,
  'CREATE INDEX idx_branch_managers_user ON branch_managers(user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
