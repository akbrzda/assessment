-- Добавление поля description в system_settings

ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER setting_value;
