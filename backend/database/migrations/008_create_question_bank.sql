-- Миграция: Банк вопросов
-- Описание: Создание таблиц для хранения переиспользуемых вопросов

-- Таблица категорий вопросов
CREATE TABLE IF NOT EXISTS question_categories (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица банка вопросов
CREATE TABLE IF NOT EXISTS question_bank (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id INT UNSIGNED,
  question_text TEXT NOT NULL,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES question_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица вариантов ответов для банка вопросов
CREATE TABLE IF NOT EXISTS question_bank_options (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  question_id INT UNSIGNED NOT NULL,
  option_text VARCHAR(512) NOT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  order_index INT DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
