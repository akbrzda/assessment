-- Настройка логотипа компании для сертификатов
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
  ('COMPANY_LOGO_URL', '', 'Путь к логотипу компании (относительно /uploads), используется в PDF-сертификатах');
