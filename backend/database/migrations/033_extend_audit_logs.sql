-- Расширение таблицы audit_logs: добавляем поля для роли/имени актора,
-- метаданных, статуса операции и контекста (scope).

ALTER TABLE audit_logs
  ADD COLUMN actor_role  VARCHAR(64)  NULL AFTER actor_user_id,
  ADD COLUMN actor_name  VARCHAR(128) NULL AFTER actor_role,
  ADD COLUMN scope       VARCHAR(64)  NULL AFTER action,
  ADD COLUMN status      ENUM('success','failure') NOT NULL DEFAULT 'success' AFTER user_agent,
  ADD COLUMN metadata_json JSON NULL AFTER after_json,
  ADD INDEX idx_audit_status (status);
