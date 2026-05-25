-- Миграция 040: права CRUD для приглашений
-- Причина: маршруты /api/v1/admin/invitations/* используют requirePermission("invitations", "invitation", ...)
-- и для роли manager нужны явные allow-записи в permissions/role_permissions.

INSERT IGNORE INTO permissions (module_code, entity_code, action_code, description, is_active)
VALUES
  ('invitations', 'invitation', 'read', 'Просмотр приглашений', 1),
  ('invitations', 'invitation', 'create', 'Создание приглашений', 1),
  ('invitations', 'invitation', 'update', 'Редактирование приглашений', 1),
  ('invitations', 'invitation', 'delete', 'Удаление приглашений', 1);

INSERT IGNORE INTO role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM roles r
JOIN permissions p
  ON p.module_code = 'invitations'
 AND p.entity_code = 'invitation'
 AND p.action_code IN ('read', 'create', 'update', 'delete')
 AND p.is_active = 1
WHERE r.name = 'manager';
