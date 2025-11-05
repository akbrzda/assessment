-- Миграция: Создание таблицы настроек системы
-- Дата: 2025-10-22
-- Описание: Таблица для хранения системных настроек (геймификация, приглашения, Telegram, общие параметры)

SET @db_name := DATABASE();

-- Проверяем наличие таблицы settings
SET @settings_table_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'settings'
);

SET @ddl := IF(
  @settings_table_exists = 0,
  'CREATE TABLE settings (
     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     category VARCHAR(50) NOT NULL COMMENT ''Категория настройки: gamification, invitations, telegram, general'',
     setting_key VARCHAR(100) NOT NULL COMMENT ''Уникальный ключ настройки'',
     setting_value TEXT COMMENT ''Значение настройки (JSON для сложных структур)'',
     value_type VARCHAR(20) NOT NULL DEFAULT ''string'' COMMENT ''Тип значения: string, number, boolean, json'',
     description TEXT COMMENT ''Описание настройки'',
     updated_by INT UNSIGNED NULL COMMENT ''ID пользователя, который последним изменил настройку'',
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY unique_setting (category, setting_key),
     CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
     INDEX idx_category (category),
     INDEX idx_key (setting_key)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Вставка начальных значений, если таблица была создана только что
SET @ddl := IF(
  @settings_table_exists = 0,
  'INSERT INTO settings (category, setting_key, setting_value, value_type, description) VALUES
    (''gamification'', ''points_per_assessment'', ''10'', ''number'', ''Базовые очки за прохождение аттестации''),
    (''gamification'', ''points_high_score'', ''20'', ''number'', ''Бонусные очки за результат выше 90%''),
    (''gamification'', ''points_perfect_score'', ''50'', ''number'', ''Бонусные очки за 100% результат''),
    (''gamification'', ''level_ranges'', ''[{\"level\":1,\"min\":0,\"max\":99,\"name\":\"Новичок\"},{\"level\":2,\"min\":100,\"max\":199,\"name\":\"Специалист\"},{\"level\":3,\"min\":200,\"max\":499,\"name\":\"Эксперт\"},{\"level\":4,\"min\":500,\"max\":999,\"name\":\"Лидер\"},{\"level\":5,\"min\":1000,\"max\":1999,\"name\":\"Мастер\"},{\"level\":6,\"min\":2000,\"max\":null,\"name\":\"Гуру\"}]'', ''json'', ''Диапазоны уровней и очков''),
    (''gamification'', ''enabled'', ''true'', ''boolean'', ''Включить геймификацию''),
    (''invitations'', ''expiry_days'', ''7'', ''number'', ''Срок действия приглашений в днях''),
    (''invitations'', ''allow_unlimited'', ''false'', ''boolean'', ''Разрешить создание приглашений без срока действия''),
    (''telegram'', ''log_chat_id'', '''', ''string'', ''ID Telegram-группы для логов''),
    (''telegram'', ''bot_token'', '''', ''string'', ''Токен Telegram-бота''),
    (''telegram'', ''logging_enabled'', ''false'', ''boolean'', ''Включить отправку логов в Telegram''),
    (''general'', ''default_assessment_timer'', ''60'', ''number'', ''Таймер по умолчанию для аттестаций (минуты)''),
    (''general'', ''max_attempts'', ''3'', ''number'', ''Максимальное количество попыток прохождения''),
    (''general'', ''allow_retake'', ''true'', ''boolean'', ''Разрешить пересдачу аттестаций''),
    (''general'', ''show_progress_bars'', ''true'', ''boolean'', ''Показывать прогресс-бары в аттестациях''),
    (''general'', ''passing_score'', ''70'', ''number'', ''Минимальный проходной балл (%)'')',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
