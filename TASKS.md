# TASKS: Реализация полноценной CRUD/RBAC системы

**Статус:** В планировании  
**Всего задач:** 52  
**Завершено:** 0

---

## Этап 6: Оптимизация и масштабируемость (P3 — nice-to-have)

- [ ] **6.1. Добавить кэширование в PermissionService**
  - Redis кэш для getEffectivePermissions(userId) с TTL 5 min
  - Инвалидация кэша при изменении role_permissions или user_permission_overrides
  - Файл: `backend/src/services/PermissionService.js`
  - Сложность: M (3-4 часа)

- [ ] **6.2. Добавить batch permission check**
  - Метод: can(users[], permission, context[])
  - Оптимизация для проверки нескольких юзеров за раз
  - Файл: `backend/src/services/PermissionService.js`
  - Сложность: M (3 часа)

- [ ] **6.3. Реализовать permission matrix UI с фильтрацией**
  - Фильтр по module, entity, action в PermissionMatrixComponent
  - Поиск по названию
  - Файл: `admin-frontend/src/components/PermissionMatrixComponent.vue`
  - Сложность: M (2-3 часа)

- [ ] **6.4. Добавить analytics на использование прав**
  - Dashboard с графиками: кто как часто использует what permissions
  - Файл: `admin-frontend/src/modules/admin/analytics/RoleUsageAnalytics.vue`
  - Сложность: L (5-6 часов)

- [ ] **6.5. Реализовать audit log viewer**
  - Таблица всех действий с фильтром по actor, entity, action, date
  - Экспорт в CSV
  - Файл: `admin-frontend/src/modules/admin/audit/AuditLogViewer.vue`
  - Сложность: M (4 часа)

- [ ] **6.6. Добавить automatic role expiration job**
  - Cron job проверяет user_roles.expires_at и деактивирует истёкшие
  - Файл: `backend/src/jobs/expireRoles.js`
  - Интеграция с node-cron
  - Сложность: S (2 часа)

- [ ] **6.7. Добавить automatic permission override expiration job**
  - Аналогично 6.6 для user_permission_overrides
  - Файл: `backend/src/jobs/expirePermissionOverrides.js`
  - Сложность: S (1 час)

---

## Этап 7: Миграция данных и финализация (P1 — завершение)

- [ ] **7.1. Создать data migration скрипт для переноса user_permissions -> user_permission_overrides**
  - Скрипт: `backend/scripts/migrate-user-permissions.js`
  - Запуск: `npm run migrate:user-permissions`
  - Бэкап перед запуском
  - Сложность: M (3 часа)

- [ ] **7.2. Обновить models для работы с новыми таблицами**
  - UserModel: добавить методы getActiveRoles(), getSoftDeletedUsers(), restore()
  - RoleModel: createRole(), updateRole(), deactivateRole()
  - Файлы: `backend/src/models/UserModel.js`, `backend/src/models/RoleModel.js`
  - Сложность: M (4 часа)

- [ ] **7.3. Обновить repositories для RBAC таблиц**
  - UserRoleRepository: find, create, update, delete
  - PermissionRepository: find, create, update, delete
  - RolePermissionRepository: find, create, update, delete
  - Файлы: `backend/src/repositories/`
  - Сложность: M (4 часа)

- [ ] **7.4. Интеграция PermissionService в admin frontend API клиент**
  - Файл: `admin-frontend/src/services/permissionService.js`
  - Метод check(action, entity) -> call /auth/check-permission
  - Использование в components для скрытия UI
  - Сложность: S (2-3 часа)

- [ ] **7.5. Добавить логирование в audit_logs для всех админ операций**
  - Middleware для логирования: who changed what when
  - Файл: `backend/src/middleware/auditLogger.js`
  - Применить к всем /admin/\* routes
  - Сложность: M (3 часа)

- [ ] **7.6. Провести финальный security audit**
  - Проверить все endpoints на missing guards
  - Проверить IDOR исправления
  - Проверить audit logs полноту
  - Документировать результаты
  - Сложность: L (6-8 часов)

- [ ] **7.7. Написать runbook для операционной команды**
  - Как добавить нового юзера с ролью
  - Как выдать временный доступ (override)
  - Как отозвать доступ
  - Как проверить кто может что
  - Файл: `docs/runbook-rbac.md`
  - Сложность: S (2 часа)

---

## Этап 8: Расширения и интеграции (P2 — расширяемость)

- [ ] **8.1. Добавить field-level permissions (phase 2)**
  - Документировать дизайн
  - Файл: `docs/engineering/field-level-permissions.md`
  - Сложность: M (3 часа — только дизайн)

- [ ] **8.2. Добавить condition-based access (phase 2)**
  - Дизайн условных правил (owner, status, date range, etc)
  - Файл: `docs/engineering/condition-based-access.md`
  - Сложность: M (3 часа — только дизайн)

- [ ] **8.3. Интеграция с LDAP/SSO (phase 3)**
  - Заглушка: `backend/src/integrations/ldap.js`
  - Документация требуемых API
  - Сложность: L (6-8 часов — только API)

- [ ] **8.4. Backup/Restore role configurations**
  - Экспорт: /admin/roles/export (JSON)
  - Импорт: /admin/roles/import (JSON)
  - Файл: `backend/src/modules/admin/roles/controller.js`
  - Сложность: M (3-4 часа)

---

## Метрики успеха

### По завершении Этапов 0-3:

- ✅ Все P0 security issues закрыты (IDOR, rate limit, SVG, audit)
- ✅ Unified PermissionService работает
- ✅ Миграция на новый guard middleware завершена
- ✅ API управления ролями/правами функционален
- ✅ Security тесты pass >90%
- ✅ Нет регрессий в существующих CRUD операциях

### По завершении Этапов 4-5:

- ✅ UI для управления ролями интуитивен
- ✅ End-to-end работает (создание роли -> assign user -> юзер может действовать)
- ✅ Audit trail полный и accessible
- ✅ Тестовое покрытие >80%

### По завершении Этапов 6-8:

- ✅ Система масштабируется
- ✅ Performance acceptable (permission check <10ms)
- ✅ Operations team self-sufficient (runbook работает)
- ✅ Architecture ready для phase 2 (field/condition-based)

---

## Примечания

- **Блокирующие зависимости:** 0._ должны быть done перед 1._, 1._ перед 2._, 2._ перед 3._
- **Параллелизм:** Внутри одного этапа задачи часто независимы
- **Review cycles:** Каждый этап должен быть code-reviewed перед слиянием в main
- **Откат:** Если что-то сломалось после миграции (7.1), есть бэкап; откатываемся и анализируем
- **Коммиты:** Каждая задача = 1 atomic commit с clear message на русском
- **Документация:** Обновляется inline, итоговый summary в docs/IMPLEMENTATION-NOTES.md после завершения
