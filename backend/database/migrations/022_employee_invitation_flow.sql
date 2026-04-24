-- Расширение потока приглашений сотрудников:
-- 1. telegram_id становится опциональным (для неактивных/pending профилей)
-- 2. Приглашение теперь хранит телефон, должность и ссылку на созданный профиль

-- Делаем telegram_id nullable для поддержки pending-профилей
ALTER TABLE users
  MODIFY telegram_id VARCHAR(32) NULL;

-- Добавляем телефон в приглашения
ALTER TABLE invitations
  ADD COLUMN phone VARCHAR(20) NULL AFTER last_name;

-- Добавляем должность в приглашения
ALTER TABLE invitations
  ADD COLUMN position_id INT UNSIGNED NULL AFTER phone;

-- Добавляем ссылку на заранее созданный профиль
ALTER TABLE invitations
  ADD COLUMN invited_user_id INT UNSIGNED NULL AFTER position_id;

-- Внешние ключи для новых полей
ALTER TABLE invitations
  ADD CONSTRAINT fk_invitations_position
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE invitations
  ADD CONSTRAINT fk_invitations_invited_user
    FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE SET NULL;
