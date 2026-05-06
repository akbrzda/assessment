# CRUD/RBAC: Архитектурный дизайн

## 1. Обзор текущего состояния

### Реализовано

- Фиксированные роли: `employee`, `manager`, `superadmin`
- Модульный доступ: `system_modules` + `user_permissions` override
- Базовая JWT-авторизация на admin маршрутах
- CRUD операции в большинстве модулей

### Проблемы

- Нет полноценной RBAC-модели (no `role_permissions`, `user_roles`)
- Hardcoded권(hardcoded) роли в конфиге `roleModules.js`
- Проверки доступа разрознены по контроллерам
- Аудит фактически не работает (no-op)
- Нет field/record/condition-level access

---

## 2. Целевая архитектура

### 2.1 Уровни доступа

```
┌─ Module Level ────────────────────────┐
│ Доступ к разделу админки (users, courses, ...) │
├─ Entity Level ────────────────────────┤
│ Доступ к типу сущности (assessments, invitations, ...) │
├─ Action Level ────────────────────────┤
│ Доступ к действию (create, read, update, delete, export, assign) │
├─ Field Level ─────────────────────────┤
│ Видимость/редактируемость полей (firstName, password, ...) │
├─ Record Level ────────────────────────┤
│ Доступ к конкретной записи (своего филиала, статус, owner) │
└─ Condition Level ─────────────────────┘
```

### 2.2 Правила приоритета

```
Порядок вычисления:
1. User.is_active == false → DENY (bypass superadmin)
2. Superadmin + is_active=true → ALLOW (все)
3. Explicit DENY (user override) → DENY
4. Explicit ALLOW (user override) → ALLOW
5. Role DENY → DENY
6. Role ALLOW → ALLOW
7. Default → DENY

Особенности:
- Отключённая роль (is_active=false) не участвует
- User override выше ролевых прав
- DENY любой роли блокирует (кроме superadmin)
- Временные права: проверка expires_at перед использованием
```

### 2.3 Слои архитектуры

```
Frontend (Vue 3)
│
├─ Permission check (UX-only, не безопасность)
│  ├─ скрытие кнопок
│  ├─ отключение полей
│  └─ условная видимость
│
└─ API call
   │
   └─ Backend (Node.js/Express)
      │
      ├─ verifyJWT
      │
      ├─ Guard/Policy middleware
      │  └─ PermissionService.can()
      │
      ├─ Service layer (бизнес-логика)
      │  └─ policy.canAccess(actor, resource, context)
      │
      └─ Response (+ audit log)
```

---

## 3. Модель данных

### 3.1 Новые таблицы

#### users (расширение)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by INT UNSIGNED NULL;
```

#### permissions

```sql
CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module_code VARCHAR(64) NOT NULL,
  entity_code VARCHAR(64),
  action_code VARCHAR(64) NOT NULL,
  field_mask VARCHAR(255),
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_permission (module_code, entity_code, action_code, field_mask),
  INDEX idx_perm_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### roles (расширение)

```sql
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system TINYINT(1) DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;
```

#### user_roles

```sql
CREATE TABLE IF NOT EXISTS user_roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  assigned_by INT UNSIGNED,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, role_id),
  INDEX idx_user_roles_user (user_id),
  INDEX idx_user_roles_role (role_id),
  INDEX idx_user_roles_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### role_permissions

```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  effect ENUM('allow', 'deny') DEFAULT 'allow',
  conditions_json JSON NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_perm (role_id, permission_id),
  INDEX idx_role_perms_role (role_id),
  INDEX idx_role_perms_perm (permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### user_permission_overrides

```sql
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  effect ENUM('allow', 'deny') DEFAULT 'allow',
  reason VARCHAR(255) NULL,
  conditions_json JSON NULL,
  expires_at DATETIME NULL,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_override (user_id, permission_id),
  INDEX idx_user_override_user (user_id),
  INDEX idx_user_override_perm (permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### audit_logs

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64),
  entity_id INT UNSIGNED,
  before_json JSON NULL,
  after_json JSON NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 4. PermissionService (backend/src/services/PermissionService.js)

### Концепция

Единая точка входа для всех проверок доступа. Автоматически применяет все правила приоритета.

### Интерфейс

```javascript
class PermissionService {
  /**
   * Проверяет, может ли пользователь выполнить действие
   * @param {Object} user - { id, role_id, branch_id }
   * @param {string} moduleCode - 'assessments', 'users', ...
   * @param {string} entityCode - 'assessment', 'user', ... (optional)
   * @param {string} actionCode - 'read', 'create', 'update', 'delete', ...
   * @param {Object} context - { recordId?, ownerId?, branchId?, status?, ... }
   * @returns {Promise<{ allowed: boolean, reason: string, source: string }>}
   */
  async can(user, moduleCode, entityCode, actionCode, context = {}) {
    // Логика проверки по приоритетам
  }

  /**
   * Получить все эффективные права пользователя
   * @returns {Promise<{ effective: [...], inherited: [...], overrides: [...] }>}
   */
  async getEffectivePermissions(userId) {
    // Merge role + override permissions
  }

  /**
   * Проверить список условий (ownership, branch, status и т.д.)
   * @private
   */
  async evaluateConditions(conditions, context) {
    // Проверка JSON условий
  }
}
```

### Реализация ключевых методов

```javascript
async can(user, moduleCode, entityCode, actionCode, context = {}) {
  // 1. Базовые проверки
  if (!user?.id) return { allowed: false, reason: 'no_user' };
  if (!user.is_active) return { allowed: false, reason: 'user_inactive' };

  // 2. Superadmin bypass
  if (user.is_superadmin) {
    return { allowed: true, reason: 'superadmin', source: 'role' };
  }

  // 3. Собрать user roles (с проверкой expires_at)
  const roles = await this.getUserActiveRoles(user.id);
  if (roles.length === 0) {
    return { allowed: false, reason: 'no_roles' };
  }

  // 4. Собрать permission_id по moduleCode+entityCode+actionCode
  const permissionId = await this.getPermissionId(moduleCode, entityCode, actionCode);
  if (!permissionId) {
    return { allowed: false, reason: 'permission_not_found' };
  }

  // 5. Проверить user overrides (DENY > ALLOW)
  const override = await this.getUserOverride(user.id, permissionId);
  if (override) {
    if (override.effect === 'deny') {
      const conditionsMet = await this.evaluateConditions(override.conditions_json, context);
      if (conditionsMet) {
        return { allowed: false, reason: 'user_explicit_deny', source: 'override' };
      }
    } else if (override.effect === 'allow') {
      const conditionsMet = await this.evaluateConditions(override.conditions_json, context);
      if (conditionsMet) {
        return { allowed: true, reason: 'user_explicit_allow', source: 'override' };
      }
    }
  }

  // 6. Проверить role permissions
  const rolePerms = await this.getRolePermissions(roles, permissionId);

  // Проверяем DENY первым
  const roleDeny = rolePerms.find(p => p.effect === 'deny');
  if (roleDeny) {
    const conditionsMet = await this.evaluateConditions(roleDeny.conditions_json, context);
    if (conditionsMet) {
      return { allowed: false, reason: 'role_deny', source: 'role' };
    }
  }

  // Проверяем ALLOW
  const roleAllow = rolePerms.find(p => p.effect === 'allow');
  if (roleAllow) {
    const conditionsMet = await this.evaluateConditions(roleAllow.conditions_json, context);
    if (conditionsMet) {
      return { allowed: true, reason: 'role_allow', source: 'role' };
    }
  }

  // 7. Default DENY
  return { allowed: false, reason: 'default_deny', source: 'system' };
}
```

---

## 5. Guard/Middleware (backend/src/middleware/permission.js)

### Использование

```javascript
// На маршруте:
router.delete("/admin/users/:id", verifyJWT, requirePermission("assessments", "user", "delete"), usersController.deleteUser);

// С кастомным context:
router.get(
  "/admin/assessments/:id/users/:userId/progress",
  verifyJWT,
  requirePermission("assessments", "assessment", "read", {
    contextBuilder: (req) => ({
      recordId: req.params.id,
      ownerId: req.params.userId,
      branchId: req.user.branch_id,
    }),
  }),
  assessmentsController.getUserProgress,
);
```

### Реализация

```javascript
function requirePermission(moduleCode, entityCode, actionCode, options = {}) {
  return async (req, res, next) => {
    const user = req.user;
    const context = options.contextBuilder ? options.contextBuilder(req) : {};

    const result = await PermissionService.can(user, moduleCode, entityCode, actionCode, context);

    if (!result.allowed) {
      const statusCode = user?.id ? 403 : 401;
      return res.status(statusCode).json({
        error: "Access denied",
        code: result.reason,
        message: `Insufficient permissions: ${result.reason}`,
      });
    }

    next();
  };
}

module.exports = requirePermission;
```

---

## 6. Policy-based authorization (backend/src/policies/\*.js)

### Примеры

#### UserPolicy

```javascript
class UserPolicy {
  static async update(actor, targetUser) {
    // Superadmin может менять всех
    if (actor.is_superadmin) return true;

    // Manager может менять только employee своего филиала
    if (actor.role_name === "manager") {
      const isSelfEdit = actor.id === targetUser.id;
      const isEmployeeTarget = targetUser.role_name === "employee";
      const isSameBranch = actor.branch_id === targetUser.branch_id;

      return isSelfEdit || (isEmployeeTarget && isSameBranch);
    }

    return false;
  }

  static async delete(actor, targetUser) {
    // Только superadmin
    if (actor.is_superadmin && actor.id !== targetUser.id) return true;
    return false;
  }

  static async viewProgress(actor, targetUser) {
    if (actor.is_superadmin) return true;
    if (actor.role_name === "manager" && actor.branch_id === targetUser.branch_id) {
      return true;
    }
    return false;
  }
}

module.exports = UserPolicy;
```

#### CoursePolicy

```javascript
class CoursePolicy {
  static async viewProgress(actor, course, targetUser) {
    // Superadmin
    if (actor.is_superadmin) return true;

    // Manager своего филиала и на аттестацию своего филиала
    if (actor.role_name === 'manager') {
      const isCourseForBranch = await this.isCourseAssignedToBranch(course.id, actor.branch_id);
      const isUserInBranch = targetUser.branch_id === actor.branch_id;
      return isCourseForBranch && isUserInBranch;
    }

    return false;
  }

  private static async isCourseAssignedToBranch(courseId, branchId) {
    // Проверка в course_branch_targets или course_position_targets с JOIN к users
    // ...
  }
}

module.exports = CoursePolicy;
```

---

## 7. API контракты

### GET /admin/roles

```json
GET /admin/roles?page=1&limit=20&search=&isActive=1

Response 200:
{
  "roles": [
    {
      "id": 2,
      "code": "manager",
      "name": "Управляющий",
      "description": "Управляет пользователями и аттестациями своего филиала",
      "priority": 50,
      "is_system": true,
      "is_active": true,
      "permissions_count": 12,
      "users_count": 5
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

### POST /admin/roles/{id}/permissions

```json
POST /admin/roles/2/permissions

Request:
{
  "permissions": [
    {
      "permissionId": 15,
      "effect": "allow",
      "conditions": null,
      "expiresAt": null
    },
    {
      "permissionId": 16,
      "effect": "deny",
      "conditions": {
        "status": ["draft"]
      },
      "expiresAt": "2026-12-31T23:59:59Z"
    }
  ]
}

Response 200:
{
  "role": { ... },
  "permissions": [ ... ]
}
```

### GET /admin/users/{id}/permissions

```json
GET /admin/users/123/permissions?includeSources=true

Response 200:
{
  "userId": 123,
  "effective": [
    {
      "id": 15,
      "module": "assessments",
      "entity": "assessment",
      "action": "create",
      "allowed": true,
      "source": "role",
      "roleId": 2,
      "expiresAt": null
    },
    {
      "id": 16,
      "module": "assessments",
      "entity": "assessment",
      "action": "delete",
      "allowed": false,
      "source": "override",
      "reason": "Запрещено до внедрения новой CRM",
      "expiresAt": "2026-12-31T23:59:59Z"
    }
  ],
  "inherited": [ ... from roles ... ],
  "overrides": [ ... user explicit ... ]
}
```

### POST /admin/users/{id}/roles

```json
POST /admin/users/123/roles

Request:
{
  "roleId": 2,
  "expiresAt": null
}

Response 200:
{
  "user": { ... },
  "roles": [
    {
      "roleId": 2,
      "roleName": "manager",
      "assignedAt": "2026-05-06T10:00:00Z",
      "expiresAt": null,
      "assignedBy": 1
    }
  ]
}
```

### POST /auth/check-permission (internal)

```json
POST /auth/check-permission
Authorization: Bearer SERVICE_TOKEN

Request:
{
  "userId": 123,
  "moduleCode": "assessments",
  "entityCode": "assessment",
  "actionCode": "delete",
  "context": {
    "recordId": 456,
    "ownerId": 123,
    "branchId": 1,
    "status": "draft"
  }
}

Response 200:
{
  "allowed": true,
  "reason": "role_allow",
  "source": "role"
}
```

---

## 8. Миграции БД

### Migration: 032_add_rbac_tables.sql

```sql
-- Создание новых таблиц для полноценной RBAC

-- 1. Расширение таблицы users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1 AFTER password;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL AFTER is_active;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by INT UNSIGNED NULL AFTER deleted_at;
ALTER TABLE users ADD INDEX idx_users_active (is_active);
ALTER TABLE users ADD INDEX idx_users_deleted (deleted_at);

-- 2. Расширение таблицы roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system TINYINT(1) DEFAULT 0 AFTER created_at;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1 AFTER is_system;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0 AFTER is_active;
ALTER TABLE roles ADD INDEX idx_roles_active (is_active);

-- 3. Таблица permissions
CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module_code VARCHAR(64) NOT NULL,
  entity_code VARCHAR(64),
  action_code VARCHAR(64) NOT NULL,
  field_mask VARCHAR(255),
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_permission (module_code, entity_code, action_code, COALESCE(field_mask, '')),
  INDEX idx_perm_module (module_code),
  INDEX idx_perm_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Таблица user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  assigned_by INT UNSIGNED,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, role_id),
  INDEX idx_user_roles_user (user_id),
  INDEX idx_user_roles_role (role_id),
  INDEX idx_user_roles_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Таблица role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  effect ENUM('allow', 'deny') DEFAULT 'allow',
  conditions_json JSON NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_perm (role_id, permission_id),
  INDEX idx_role_perms_role (role_id),
  INDEX idx_role_perms_perm (permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Таблица user_permission_overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  effect ENUM('allow', 'deny') DEFAULT 'allow',
  reason VARCHAR(255) NULL,
  conditions_json JSON NULL,
  expires_at DATETIME NULL,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_override (user_id, permission_id),
  INDEX idx_user_override_user (user_id),
  INDEX idx_user_override_perm (permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Таблица audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64),
  entity_id INT UNSIGNED,
  before_json JSON NULL,
  after_json JSON NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Инициализация базовых permissions из текущей структуры
INSERT IGNORE INTO permissions (module_code, entity_code, action_code, description)
SELECT DISTINCT
  sm.code AS module_code,
  'resource' AS entity_code,
  'access' AS action_code,
  CONCAT('Доступ к модулю ', sm.name) AS description
FROM system_modules sm
WHERE sm.is_active = 1;

-- 9. Маркировка системных ролей
UPDATE roles SET is_system = 1 WHERE name IN ('employee', 'manager', 'superadmin');
```

---

## 9. Примеры использования

### Пример 1: Проверка доступа в контроллере

```javascript
async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const currentUser = req.user;

    // Получить пользователя для удаления
    const targetUser = await userModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Проверить политику
    const canDelete = await UserPolicy.delete(currentUser, targetUser);
    if (!canDelete) {
      return res.status(403).json({ error: "You cannot delete this user" });
    }

    // Выполнить удаление (мягкое)
    await userModel.softDelete(userId, currentUser.id);

    // Аудит
    await AuditService.log({
      actor_user_id: currentUser.id,
      action: "user.deleted",
      entity_type: "user",
      entity_id: userId,
      before_json: JSON.stringify(targetUser),
      after_json: JSON.stringify({ ...targetUser, deleted_at: new Date() }),
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
```

### Пример 2: Фильтрация списка по доступам

```javascript
async function listUsers(req, res, next) {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 20 } = req.query;

    let query = "SELECT * FROM users WHERE 1=1";
    const params = [];

    // Применяем access scope в зависимости от роли
    if (currentUser.role_name === "manager") {
      // Manager видит только своего филиала
      query += " AND branch_id = ?";
      params.push(currentUser.branch_id);
    } else if (currentUser.role_name === "employee") {
      // Employee видит только себя
      query += " AND id = ?";
      params.push(currentUser.id);
    }
    // superadmin видит всех

    // Пагинация
    query += " LIMIT ? OFFSET ?";
    params.push(limit, (page - 1) * limit);

    const [users] = await pool.query(query, params);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}
```

---

## 10. Миграция с текущей системы

### Шаг 1: Создать permissions из текущих module_codes

```sql
INSERT INTO permissions (module_code, entity_code, action_code)
SELECT code, 'module', 'access' FROM system_modules WHERE is_active = 1;
```

### Шаг 2: Заполнить role_permissions на основе roleModules.js

```sql
-- manager получает все свои модули
INSERT INTO role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM roles r
JOIN permissions p ON p.module_code IN ('assessments', 'analytics', 'users', 'questions', 'invitations')
WHERE r.name = 'manager' AND p.action_code = 'access';

-- superadmin получает всё
INSERT INTO role_permissions (role_id, permission_id, effect)
SELECT r.id, p.id, 'allow'
FROM roles r
JOIN permissions p
WHERE r.name = 'superadmin' AND p.action_code = 'access';
```

### Шаг 3: Преобразовать user_permissions в user_roles + user_permission_overrides

```sql
-- Текущая user_permissions таблица хранит override на уровне модуля
-- Нужно преобразовать в новую модель:
-- - для каждого user с кастомным доступом заполнить user_permission_overrides
-- - или сохранить как есть (backward compatibility)
```

---

## 11. Чеклист реализации

- [ ] Создать миграцию 032_add_rbac_tables.sql
- [ ] Реализовать PermissionService
- [ ] Создать Guard middleware requirePermission
- [ ] Создать Policy классы (UserPolicy, CoursePolicy, AssessmentPolicy)
- [ ] Обновить AuditService для персистентного логирования
- [ ] Обновить ключевые endpoints на новый guard
- [ ] Создать/обновить API админки для управления ролями
- [ ] Добавить UI экраны (роли, матрица прав, overrides)
- [ ] Добавить unit/integration тесты на permission logic
- [ ] Провести security review

---

## 12. Ссылки на связанные документы

- [API Guidelines](./api-guidelines.md)
- [Architecture](./architecture.md)
- [Code Standards](./code-standards.md)
- [Security Analysis](../../CRUD-RBAC-AUDIT.md)
