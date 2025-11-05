-- Добавление настройки BOT_USERNAME для генерации ссылок-приглашений

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('BOT_USERNAME', 'your_bot', 'Username Telegram бота (без @) для генерации ссылок-приглашений')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
