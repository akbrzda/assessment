-- Миграция 037: уникальный индекс на invitations.used_by
-- Цель: на уровне БД гарантировать, что один пользователь не может
-- активировать два разных приглашения (дополнительная защита от race condition).
-- NULL допускается для неиспользованных приглашений (MySQL позволяет несколько NULL
-- в UNIQUE-колонке), поэтому ограничение не затрагивает pending-записи.

ALTER TABLE invitations
  ADD CONSTRAINT uq_invitations_used_by UNIQUE (used_by);
