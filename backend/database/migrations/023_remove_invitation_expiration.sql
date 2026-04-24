-- Удаляем срок действия приглашений: ссылки теперь бессрочные
ALTER TABLE invitations DROP INDEX idx_expires;
ALTER TABLE invitations DROP COLUMN expires_at;
