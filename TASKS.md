# Задачи проекта

Источник: [PROJECT_TASKS_BACKLOG.md](PROJECT_TASKS_BACKLOG.md)  
Обновлено: 2026-05-21  
Включены только активные задачи (статус ⚠️ PARTIAL и ❌ TODO). Завершённые (✅ DONE) удалены.

---

## Спринт 3 — Инфраструктура и надёжность (HIGH DevOps / Performance)

### TASK-014 · CI/CD: release gates и post-release monitoring ❌

- [ ] Создать базовый CI pipeline (GitHub Actions / GitLab CI): lint + тесты для backend
- [ ] Добавить pipeline для frontend и admin-frontend
- [ ] Добавить pipeline для bot
- [ ] Зафиксировать обязательные release gates (тесты, lint, security scan)

### TASK-028 · CI quality gates ❌

- [ ] Настроить автозапуск тестов при PR (backend `jest`, frontend build check)
- [ ] Добавить lint-проверку (ESLint) в CI
- [ ] Опционально: OWASP dependency check или аналог

### TASK-013 · Centralized logging: correlation id и алерты ⚠️

- [ ] Добавить middleware генерации `X-Request-Id` / correlation id в backend
- [ ] Передавать correlation id в логах Winston
- [ ] Оценить и выбрать инструмент централизации логов (Loki / ELK / Datadog)
- [ ] Настроить базовые алерты по ошибкам 5xx и критическим событиям

### TASK-016 · Read-replica strategy для аналитики ❌

- [ ] Настроить read-replica подключение в конфиге БД
- [ ] Направить аналитические запросы (`courseAnalytics`, `analytics/admin`) на реплику
- [ ] Реализовать fallback на primary при недоступности реплики
- [ ] Shadow-read тест на staging

---

## Спринт 4 — Качество и документация (MEDIUM)

### TASK-007 · OpenAPI-спецификация ❌

- [ ] Создать статический `openapi.yaml` с покрытием ключевых endpoint (auth, courses, certificates)
- [ ] Добавить Swagger UI или ссылку на документацию в README

### TASK-019 · Согласование стандартов коммитов ⚠️

- [ ] Обновить `docs/engineering/code-standards.md` раздел 8 — **выполнено** ✅
- [ ] Проверить, нет ли других внутренних документов с упоминанием Conventional Commits

### TASK-020 · Свернуть дубли документации по «Курсам» ❌

- [ ] Убрать дублирующие бизнес-правила из `docs/courses/screen-spec.md` (оставить только UX)
- [ ] Свернуть перекрывающийся контент `docs/product/courses-requirements.md` до ссылок на `docs/courses/design.md`
- [ ] Обновить `ROADMAP.md`: закрытые спринты пометить, убрать дубли требований

### TASK-014 · CI/CD: release gates и post-release monitoring ❌

- [ ] Создать базовый CI pipeline (GitHub Actions / GitLab CI): lint + тесты для backend
- [ ] Добавить pipeline для frontend и admin-frontend
- [ ] Добавить pipeline для bot
- [ ] Зафиксировать обязательные release gates (тесты, lint, security scan)

### TASK-028 · CI quality gates ❌

- [ ] Настроить автозапуск тестов при PR (backend `jest`, frontend build check)
- [ ] Добавить lint-проверку (ESLint) в CI
- [ ] Опционально: OWASP dependency check или аналог

### TASK-013 · Centralized logging: correlation id и алерты ⚠️

- [ ] Добавить middleware генерации `X-Request-Id` / correlation id в backend
- [ ] Передавать correlation id в логах Winston
- [ ] Оценить и выбрать инструмент централизации логов (Loki / ELK / Datadog)
- [ ] Настроить базовые алерты по ошибкам 5xx и критическим событиям

### TASK-016 · Read-replica strategy для аналитики ❌

- [ ] Настроить read-replica подключение в конфиге БД
- [ ] Направить аналитические запросы (`courseAnalytics`, `analytics/admin`) на реплику
- [ ] Реализовать fallback на primary при недоступности реплики
- [ ] Shadow-read тест на staging

---

## Спринт 4 — Качество и документация (MEDIUM)

### TASK-007 · OpenAPI-спецификация ❌

- [ ] Создать статический `openapi.yaml` с покрытием ключевых endpoint (auth, courses, certificates)
- [ ] Добавить Swagger UI или ссылку на документацию в README

### TASK-019 · Согласование стандартов коммитов ⚠️

- [ ] Обновить `docs/engineering/code-standards.md` раздел 8 — **выполнено** ✅
- [ ] Проверить, нет ли других внутренних документов с упоминанием Conventional Commits

### TASK-020 · Свернуть дубли документации по «Курсам» ❌

- [ ] Убрать дублирующие бизнес-правила из `docs/courses/screen-spec.md` (оставить только UX)
- [ ] Свернуть перекрывающийся контент `docs/product/courses-requirements.md` до ссылок на `docs/courses/design.md`
- [ ] Обновить `ROADMAP.md`: закрытые спринты пометить, убрать дубли требований

### TASK-023 · Offline: service worker и retry queue ⚠️

- [ ] Добавить service worker с кэшированием GET-запросов (список курсов, прогресс)
- [ ] Реализовать retry queue для POST-запросов (отметка прогресса) при восстановлении сети

### TASK-026 · Документация деплоя и rollback ❌

- [ ] Создать `docs/operations/deploy.md` с инструкцией деплоя backend/frontend/admin/bot
- [ ] Добавить `docs/operations/rollback.md` — шаги отката для каждого сервиса
- [ ] Описать переменные окружения для `dev/stage/prod`

### TASK-027 · Маскирование ПДн в логах ⚠️

- [ ] Определить список чувствительных полей (phone, telegram_id, токены, ПДн)
- [ ] Добавить winston formatter или middleware, маскирующий эти поля перед записью в лог

---

## Спринт 5 — Улучшения и технический долг (MEDIUM/LOW)

### TASK-017 · QA-чеклист по «Курсам» ❓

- [ ] Прогнать regression pack по всем сценариям из `docs/courses/design.md`
- [ ] Зафиксировать результат и нераскрытые edge-cases

### TASK-024 · Accessibility WCAG ❓

- [ ] Провести автоматизированный audit (axe / Lighthouse) по MiniApp
- [ ] Исправить критические нарушения: contrast, progressbar aria, focus-visible, touch-target

### TASK-029 · UI-документация компонентов ❌

- [ ] Расширить `docs/frontend.md` или создать `docs/engineering/ui-components.md`
- [ ] Покрыть ключевые переиспользуемые компоненты admin-frontend

### TASK-030 · Архивный backlog ❌

- [ ] Просмотреть `docs/archive/features-backlog.md`
- [ ] Активные/незакрытые пункты добавить в этот файл или PROJECT_TASKS_BACKLOG.md
- [ ] Оставить в архиве только исторический snapshot

### TASK-031 · Захардкоженный бренд в подтеме ❓

- [ ] Найти компоненты подтемы с захардкоженным названием бренда
- [ ] Вынести в конфигурацию или настройки компании/тенанта

### TASK-032 · Оптимизация аналитических запросов ❓

- [ ] Запустить EXPLAIN на тяжёлых запросах в `courseAnalytics.repository.js` и `analyticsModel.js`
- [ ] Добавить недостающие индексы
- [ ] При необходимости ввести кэширование результатов (Redis)
