-- Добавление настроек из ENV в систему
-- Эти настройки будут отображаться в админ-панели для управления

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('LOG_CHAT_ID', '-4849180559'),
  ('INVITE_EXPIRATION_DAYS', '7'),
  ('SUPERADMIN_IDS', '5089263300')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
