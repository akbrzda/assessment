-- Миграция: Добавление типов вопросов
-- Описание: Добавление поля question_type и корректного ответа для текстовых вопросов

SET @db_name := DATABASE();

-- Добавляем колонку question_type, если ее нет
SET @question_type_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'question_bank'
    AND COLUMN_NAME = 'question_type'
);

SET @ddl := IF(
  @question_type_exists = 0,
  'ALTER TABLE question_bank ADD COLUMN question_type ENUM(''single'', ''multiple'', ''text'') NOT NULL DEFAULT ''single'' AFTER question_text',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Добавляем колонку correct_text_answer, если ее нет
SET @correct_text_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'question_bank'
    AND COLUMN_NAME = 'correct_text_answer'
);

SET @ddl := IF(
  @correct_text_exists = 0,
  'ALTER TABLE question_bank ADD COLUMN correct_text_answer TEXT AFTER question_type',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Создаем индекс по типу вопроса, если отсутствует
SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'question_bank'
    AND INDEX_NAME = 'idx_question_type'
);

SET @ddl := IF(
  @idx_exists = 0,
  'CREATE INDEX idx_question_type ON question_bank(question_type)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Обновляем комментарий колонки question_type, если колонка существует
SET @ddl := IF(
  @question_type_exists = 0,
  'SELECT 1', -- Колонка только что создана с корректным определением
  'ALTER TABLE question_bank MODIFY COLUMN question_type ENUM(''single'', ''multiple'', ''text'') NOT NULL DEFAULT ''single'' COMMENT ''Тип вопроса: single - один вариант, multiple - множественный выбор, text - текстовый ответ'''
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Обновляем комментарий колонки correct_text_answer, если колонка существует
SET @ddl := IF(
  @correct_text_exists = 0,
  'SELECT 1', -- Колонка только что создана
  'ALTER TABLE question_bank MODIFY COLUMN correct_text_answer TEXT COMMENT ''Эталонный ответ для текстового типа вопроса'''
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
