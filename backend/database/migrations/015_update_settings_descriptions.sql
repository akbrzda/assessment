-- Добавление описаний к существующим настройкам

UPDATE system_settings SET description = 'ID группы Telegram для отправки системных логов и уведомлений' WHERE setting_key = 'LOG_CHAT_ID';
UPDATE system_settings SET description = 'Срок действия ссылок-приглашений для управляющих (в днях)' WHERE setting_key = 'INVITE_EXPIRATION_DAYS';
UPDATE system_settings SET description = 'Telegram ID суперадминов через запятую (например: 123456,789012)' WHERE setting_key = 'SUPERADMIN_IDS';
