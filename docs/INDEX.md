# Индекс документации проекта

Дата актуализации: 2026-05-21 (обновлено: очистка)

## 1. Карта документов

| Документ                                                                                                             | Назначение                                                        | Статус              | Актуальность | Дубликаты/пересечения                                                                             | Рекомендация                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------- | ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [docs/README.md](docs/README.md)                                                                                     | Точка входа в документацию                                        | Актуален            | Высокая      | Частично дублируется с данным индексом                                                            | Оставить как краткий навигатор, ссылаться на этот индекс                             |
| [ROADMAP.md](ROADMAP.md)                                                                                             | Детальный план по модулю «Курсы» и backlog                        | Частично актуален   | Высокая      | Пересекается с `docs/courses/design.md`, `docs/courses/screen-spec.md`, `PROJECT_AUDIT_REPORT.md` | Сохранить как план реализации, но вынести закрытые задачи в архив                    |
| [PROJECT_AUDIT.md](PROJECT_AUDIT.md)                                                                                 | Архитектурный/безопасностный/UI-аудит                             | Актуален            | Высокая      | Перекрывает риски из `engineering/*` и `ROADMAP.md`                                               | Оставить источником рисков и улучшений, сверять с фактическим кодом по кварталам     |
| [PROJECT_TASKS_BACKLOG.md](PROJECT_TASKS_BACKLOG.md)                                                                 | Консолидированный backlog с результатами аудита кода              | Актуален            | Высокая      | Агрегирует задачи из всех источников                                                              | Основной трекинговый документ; обновлять при каждом аудите                           |
| [docs/product/courses-requirements.md](docs/product/courses-requirements.md)                                         | Бизнес-требования по курсам                                       | Актуален            | Высокая      | Пересекается с `docs/courses/design.md`                                                           | Оставить как продуктовый источник, техдетали держать в `docs/courses/design.md`      |
| [docs/courses/design.md](docs/courses/design.md)                                                                     | Полная техспека «Курсы»                                           | Актуален            | Высокая      | Дубли по UX и сценариям с `docs/courses/screen-spec.md`, `ROADMAP.md`                             | **Главный техдокумент по модулю** — источник истины                                  |
| [docs/courses/screen-spec.md](docs/courses/screen-spec.md)                                                           | Экранная спецификация + UX-риски                                  | Актуален            | Высокая      | Существенный overlap с `docs/courses/design.md`                                                   | Оставить как UX/экранный слой; убрать дубли бизнес-правил                            |
| [docs/courses/api-contracts.md](docs/courses/api-contracts.md)                                                       | Контракты Sprint 1-2 по курсам                                    | Устарел             | Низкая       | Узкий срез API, пересекается с `docs/courses/design.md`                                           | Расширить до полного API или поглотить в `design.md`                                 |
| [docs/product/max-telegram-unified-integration.md](docs/product/max-telegram-unified-integration.md)                 | Единый flow MAX/Telegram                                          | Актуален            | Высокая      | Перекрывает roadmap и runbook                                                                     | Оставить источником бизнес-правил интеграции                                         |
| [docs/product/max-telegram-unified-roadmap.md](docs/product/max-telegram-unified-roadmap.md)                         | Спринтовый план MAX/Telegram                                      | Частично актуален   | Высокая      | Конфликтует по статусам с фактом реализации                                                       | Обновить статусы незавершённых пунктов по данным аудита                              |
| [docs/engineering/max-telegram-runbook.md](docs/engineering/max-telegram-runbook.md)                                 | Операционный runbook инцидентов                                   | Актуален            | Высокая      | Пересекается с release checklist                                                                  | Оставить, добавить ссылки на мониторинг/дашборды                                     |
| [docs/engineering/release-checklist-max-telegram.md](docs/engineering/release-checklist-max-telegram.md)             | Чеклист релиза MAX/Telegram                                       | Актуален            | Высокая      | Частично дублирует пункты в roadmap                                                               | Оставить, использовать как обязательный gate                                         |
| [docs/product/bot-features.md](docs/product/bot-features.md)                                                         | Полный план доработки бота/уведомлений/сертификатов               | Частично актуален   | Высокая      | Пересечения с `docs/archive/features-backlog.md`, аудитом                                         | Разделить на MVP и Post-MVP в отдельных секциях                                      |
| [docs/engineering/crud-rbac-design.md](docs/engineering/crud-rbac-design.md)                                         | Целевой дизайн RBAC/permissions                                   | Частично актуален   | Средняя      | Чеклист пересекается с аудитом                                                                    | Отметить реализованные пункты (TASK-005 закрыта)                                     |
| [docs/engineering/api-guidelines.md](docs/engineering/api-guidelines.md)                                             | Стандарты REST API                                                | Актуален            | Высокая      | Конфликт с частью существующих endpoint без versioning                                            | Оставить как целевой стандарт                                                        |
| [docs/engineering/architecture.md](docs/engineering/architecture.md)                                                 | Архитектурный регламент                                           | Актуален            | Высокая      | Пересечение с code standards                                                                      | Оставить базовым инженерным документом                                               |
| [docs/engineering/code-standards.md](docs/engineering/code-standards.md)                                             | Стандарты кода                                                    | Актуален            | Высокая      | Конфликт с `AGENTS.md` по commit-стилю **устранён** (раздел 8.1 обновлён)                         | Содержит ссылку на правила AGENTS.md как приоритет                                   |
| [docs/engineering/components.md](docs/engineering/components.md)                                                     | Минимальная документация компонентов                              | Частично устарел    | Средняя      | Частичное дублирование с `docs/design/system.md`                                                  | Обновить под фактический UI kit или объединить                                       |
| [docs/design/system.md](docs/design/system.md)                                                                       | Стратегия дизайн-системы                                          | Актуален            | Высокая      | Пересечения с `docs/design/migration-roadmap.md`                                                  | Оставить как целевой дизайн-принцип                                                  |
| [docs/design/migration-roadmap.md](docs/design/migration-roadmap.md)                                                 | План миграции admin UI                                            | Актуален            | Высокая      | Пересекается с UI-рисками из аудита                                                               | Оставить как delivery-план по UI                                                     |
| [docs/engineering/centralized-logging.md](docs/engineering/centralized-logging.md)                                   | План централизации логов                                          | Плановый            | Средняя      | Пересечения с аудитом инфраструктуры                                                              | Winston подключён; Loki/ELK/correlation ID — не реализованы (TASK-013)               |
| [docs/engineering/read-replica-strategy.md](docs/engineering/read-replica-strategy.md)                               | План read-replica для аналитики                                   | Плановый            | Средняя      | Зависит от backend-приоритетов                                                                    | В backlog как performance-инициатива (TASK-016)                                      |
| [docs/engineering/miniapp-offline-graceful-degradation.md](docs/engineering/miniapp-offline-graceful-degradation.md) | Поведение MiniApp при offline                                     | Частично реализован | Средняя      | Пересекается с UX-аудитом                                                                         | UI-баннер готов; service worker и кэш — не реализованы (TASK-023)                    |
| ~~docs/frontend.md~~ (удалён)                                                                                        | API `PermissionMatrix` — перенесено в `engineering/components.md` | Удалён              | —            | —                                                                                                 | Объединён с components.md (TASK-029 ✅)                                              |
| ~~docs/archive/features-backlog.md~~ (удалён)                                                                        | Сырой исторический backlog                                        | Удалён              | —            | Задачи мигрированы в PROJECT_TASKS_BACKLOG.md                                                     | Удалён как завершённый архив                                                         |
| [AGENTS.md](AGENTS.md)                                                                                               | Рабочие правила для AI-агента проекта                             | Актуален            | Высокая      | Конфликт с `docs/engineering/code-standards.md` **устранён**                                      | Правила AGENTS.md имеют приоритет над org-стандартом                                 |
| [TASKS.md](TASKS.md)                                                                                                 | Операционный список текущих задач                                 | Пустой              | —            | Нет                                                                                               | Поддерживать только актуальные задачи; основной трекинг — в PROJECT_TASKS_BACKLOG.md |

## 2. Выявленные противоречия

1. ~~`docs/engineering/code-standards.md` требует Conventional Commits, а `AGENTS.md` запрещает их.~~ **Устранено**: раздел 8.1 `code-standards.md` обновлён — добавлен приоритет правил AGENTS.md.
2. `docs/engineering/api-guidelines.md` требует versioned API (`/api/v1/...`), аудит фиксирует отсутствие versioning в части API.
3. `docs/product/max-telegram-unified-roadmap.md` содержит закрытые спринты без актуализации статусов.
4. `ROADMAP.md` ссылается на `courses_design.md`; фактическое название файла — [docs/courses/design.md](docs/courses/design.md).

## 3. Дубликаты и пересечения

1. Бизнес-правила «Курсов» продублированы в [docs/product/courses-requirements.md](docs/product/courses-requirements.md), [docs/courses/design.md](docs/courses/design.md), [docs/courses/screen-spec.md](docs/courses/screen-spec.md), [ROADMAP.md](ROADMAP.md).
2. Тема RBAC параллельно ведётся в [engineering/crud-rbac-design.md](engineering/crud-rbac-design.md) и [PROJECT_AUDIT.md](PROJECT_AUDIT.md).
3. Интеграция MAX/Telegram описана одновременно в интеграционном документе, roadmap, runbook и release checklist.

## 4. Документы с риском устаревания

1. [courses/api-contracts.md](courses/api-contracts.md) — покрывает только Sprint 1-2; помечен как устаревший.
2. [engineering/components.md](engineering/components.md) — обновлён: добавлена секция PermissionMatrixComponent API.

## 5. Текущая структура документации (после очистки 2026-05-21)

```text
docs/
  INDEX.md                          # этот файл — индекс и карта
  README.md                         # точка входа (навигатор)
  PROJECT_AUDIT.md                  # аудит архитектуры и безопасности
  product/
  engineering/
  courses/
  design/
  # archive/ — удалена (задачи перенесены в PROJECT_TASKS_BACKLOG.md)

Корень репозитория:
  AGENTS.md, TASKS.md, ROADMAP.md, PROJECT_TASKS_BACKLOG.md
```

## 6. Missing documentation

1. Единый `CONTRIBUTING.md` с процессом PR/review.
2. Runbook деплоя и rollback для backend/frontend/admin/bot.
3. Актуальный API reference (OpenAPI) в одном месте.
4. Документация по окружениям (`dev/stage/prod`) и переменным.
5. Документация по DR/backup и восстановлению БД.
6. Data governance: политика хранения персональных данных и токенов.
