# Консолидированный backlog проекта

Дата консолидации: 2026-05-21  
Дата последнего аудита кода: 2026-05-21  
Источники: `docs/*`, `ROADMAP.md`, `PROJECT_AUDIT_REPORT.md`, `AGENTS.md`

## 1. Правила приоритизации

- `CRITICAL`: блокер безопасности/данных/релиза.
- `HIGH`: критично для бизнес-потока и стабильной эксплуатации.
- `MEDIUM`: важно для качества, масштабирования и UX.
- `LOW`: улучшения и долгосрочная оптимизация.

## 2. Статусы реализации

- `✅ DONE` — реализовано полностью, подтверждено в коде.
- `⚠️ PARTIAL` — реализовано частично; остаток зафиксирован в «Что осталось».
- `❌ TODO` — не реализовано.
- `❓ UNKNOWN` — нет возможности проверить из кода (процессная задача или отсутствует в репо).

## 3. Сводная таблица задач

| ID       | Priority | Type           | Area               | Status     | Description                                                                      | Что осталось / Примечание                                                                                                                                                                                     |
| -------- | -------- | -------------- | ------------------ | ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TASK-001 | CRITICAL | SECURITY       | Auth/Internal API  | ✅ DONE    | Заменить `BOT_TOKEN` как Bearer для internal API на отдельный service token      | Бот передаёт `INTERNAL_API_SECRET`; `verifyBotToken.js` проверяет его. Ротация — ручная (env-переменная)                                                                                                      |
| TASK-002 | CRITICAL | SECURITY       | Auth               | ✅ DONE    | Перевести хранение refresh token на безопасную схему (hash + rotation)           | bcrypt-хэш в `auth/admin/service.js`, ротация при refresh. Revoke-list отсутствует — для принудительного отзыва нужна очистка записи в БД                                                                     |
| TASK-003 | CRITICAL | SECURITY       | Web Security       | ⚠️ PARTIAL | Аудит `v-html`/санитизации контента (XSS риск)                                   | `SubtopicView.vue` имеет ручной DOM-санитайзер. `AssessmentTheoryView.vue` использует `v-html` с `formatText()` без аналогичной защиты. Нет унифицированной политики, нет тестов XSS payload                  |
| TASK-004 | CRITICAL | BUG            | DB/Migrations      | ❓ UNKNOWN | Исправить коллизию нумерации миграций `031_*`                                    | Папка `migrations/` отсутствует в репозитории — статус не поддаётся проверке из кода                                                                                                                          |
| TASK-005 | HIGH     | FEATURE        | RBAC               | ✅ DONE    | Внедрение PermissionService, policy/guard и role-permission model                | `PermissionService.js` реализован полностью: user overrides, role permissions, conditions, superadmin bypass. Политики: `AssessmentPolicy`, `CoursePolicy`, `UserPolicy`                                      |
| TASK-006 | HIGH     | TECHNICAL DEBT | Courses            | ❌ TODO    | Backend-пересчёт статуса `completed_locked` при изменении структуры курса        | Статус `completed_locked` в коде не обнаружен. Батчевый алгоритм не реализован                                                                                                                                |
| TASK-007 | HIGH     | DOCUMENTATION  | API                | ❌ TODO    | Единый актуальный OpenAPI (versioned) + синхронизация с endpoint                 | OpenAPI/Swagger отсутствует в проекте                                                                                                                                                                         |
| TASK-008 | HIGH     | SECURITY       | Platform Auth      | ✅ DONE    | Валидация `auth_date` и проверка «не из будущего» для MAX/Telegram initData      | Реализовано в `telegramAuthService.js` и `maxAuthService.js`: проверка наличия, корректности и истечения (24ч) `auth_date`                                                                                    |
| TASK-009 | HIGH     | FEATURE        | Frontend (MiniApp) | ⚠️ PARTIAL | Platform-agnostic auth bootstrap + экран подтверждения номера + единые UX-ошибки | Auth bootstrap реализован (`telegram.js` store с auto-detect MAX/Telegram). Экран подтверждения номера телефона не обнаружен. Единые UX-ошибки не стандартизированы                                           |
| TASK-010 | HIGH     | FEATURE        | Bot                | ⚠️ PARTIAL | Parity bot-flow: invite links для MAX/Telegram и `request_contact` сценарии      | Telegram invite deeplinks обрабатываются (`invite_*` payload в `/start`). MAX-специфичные invite links и `request_contact` сценарии не реализованы                                                            |
| TASK-011 | HIGH     | FEATURE        | Notifications      | ✅ DONE    | Event-driven уведомления о новых курсах/результатах в боте                       | Полная реализация: `notificationService.js`, `notificationScheduler.js`, `notificationSender.js`, дедупликация, тихие часы, retry (до 3 попыток)                                                              |
| TASK-012 | HIGH     | FEATURE        | Certificates       | ✅ DONE    | Модуль сертификатов (public/admin API + PDF + verify endpoint)                   | Реализовано полностью: verify-маршрут (публичный), public API (список, скачать), admin API (список, выдать, отозвать, переаттестация), PDF-генерация                                                          |
| TASK-013 | HIGH     | DEVOPS         | Observability      | ⚠️ PARTIAL | Централизованный сбор логов (Loki/ELK), correlation id, алерты                   | Winston-логгер подключён (файл + консоль). Loki/ELK, correlation id и алерты не реализованы                                                                                                                   |
| TASK-014 | HIGH     | DEVOPS         | Release            | ❌ TODO    | Release gates и post-release monitoring для MAX/Telegram                         | CI/CD конфигурация в репозитории отсутствует                                                                                                                                                                  |
| TASK-015 | HIGH     | UX             | MiniApp            | ✅ DONE    | Dead UI элементы (Bell), таймер чтения, быстрый «Продолжить»                     | Bell реализован (настройки уведомлений в ProfileView). Таймер чтения реализован (`AssessmentTheoryView`, `ReadingTimerNotice`). Проверить оставшиеся UX-победы по аудиту                                      |
| TASK-016 | HIGH     | PERFORMANCE    | Backend Analytics  | ❌ TODO    | Read-replica strategy для аналитических запросов + fallback                      | Реализация read-replica отсутствует; все запросы идут через основной пул                                                                                                                                      |
| TASK-017 | HIGH     | QUALITY        | QA                 | ❓ UNKNOWN | QA-чеклист по «Курсам» и edge-cases из design/spec                               | Процессная задача, не верифицируется из кода                                                                                                                                                                  |
| TASK-018 | HIGH     | SECURITY       | Anti-fraud         | ⚠️ PARTIAL | Защита от race-condition при invite activation                                   | `markUsed` содержит `AND used_by IS NULL` — базовая защита от двойного использования. `FOR UPDATE`-блокировка при активации отсутствует — race condition при параллельных запросах остаётся                   |
| TASK-019 | MEDIUM   | DOCUMENTATION  | Standards          | ⚠️ PARTIAL | Устранить конфликт правил коммитов между `AGENTS.md` и `code-standards.md`       | В `code-standards.md` описаны Conventional Commits на английском; `AGENTS.md` явно их запрещает. Конфликт устраняется в ходе текущей документационной работы                                                  |
| TASK-020 | MEDIUM   | DOCUMENTATION  | Courses Docs       | ❌ TODO    | Свернуть дубли между product/design/screen-spec/roadmap по модулю «Курсы»        | Дублирование сохраняется. Требуется редакционная работа по документам                                                                                                                                         |
| TASK-021 | MEDIUM   | FEATURE        | Admin Analytics    | ✅ DONE    | Аналитика курсов: summary, детализация, фильтры, экспорт                         | `courseAnalytics.repository.js` реализован; admin controller использует аналитику. API: funnel, sections, progress-report. Экспорт Excel и CSV реализован для аналитики и аттестаций                          |
| TASK-022 | MEDIUM   | FEATURE        | Change Log         | ⚠️ PARTIAL | Журнал изменений курса (backend+UI)                                              | `course_events` таблица и `insertCourseEvent` реализованы (прогресс пользователя: started, completed, topic_completed и т.д.). Журнал административных изменений структуры курса (UI в админке) не реализован |
| TASK-023 | MEDIUM   | FEATURE        | Offline            | ⚠️ PARTIAL | Offline cache GET и retry queue POST для MiniApp                                 | UI-баннер при потере соединения реализован (`App.vue`). Service worker, GET-кэш и retry queue POST отсутствуют                                                                                                |
| TASK-024 | MEDIUM   | UX             | Accessibility      | ❓ UNKNOWN | WCAG: contrast, `progressbar` aria, `focus-visible`, touch-target ≥44px          | Требует ручного или автоматизированного accessibility аудита                                                                                                                                                  |
| TASK-025 | MEDIUM   | REFACTOR       | Bot                | ✅ DONE    | Переход с polling на webhook + FSM для многошаговых диалогов                     | Webhook реализован (`BOT_WEBHOOK_DOMAIN` + Telegraf webhook). FSM онбординга реализован (`ONBOARDING_FSM` в `bot/src/index.js`)                                                                               |
| TASK-026 | MEDIUM   | DOCUMENTATION  | Operations         | ❌ TODO    | Единый deploy/rollback/runbook пакет для всех сервисов                           | Директория `docs/operations/` отсутствует                                                                                                                                                                     |
| TASK-027 | MEDIUM   | SECURITY       | Data Privacy       | ⚠️ PARTIAL | Политика логирования ПДн/секретов и маскирование                                 | Winston-логгер настроен. Централизованный sanitizer для маскирования ПДн в логах отсутствует                                                                                                                  |
| TASK-028 | MEDIUM   | DEVOPS         | CI/CD              | ❌ TODO    | CI quality gates (tests, lint, security scan, docs check)                        | CI-конфигурация отсутствует                                                                                                                                                                                   |
| TASK-029 | LOW      | DOCUMENTATION  | Component Docs     | ❌ TODO    | Актуализировать `docs/frontend.md` в модульную документацию UI                   | Файл описывает только `PermissionMatrix`; полноценная UI-документация отсутствует                                                                                                                             |
| TASK-030 | LOW      | ARCHIVE        | Backlog Hygiene    | ❌ TODO    | Очистить `docs/archive/features-backlog.md`                                      | Активные задачи в архивном файле не перенесены; файл не пересмотрен                                                                                                                                           |
| TASK-031 | LOW      | UX             | Branding           | ❓ UNKNOWN | Убрать захардкоженный бренд в клиентской подтеме и перевести в конфиг            | Требует проверки конкретных компонентов подтемы                                                                                                                                                               |
| TASK-032 | LOW      | PERFORMANCE    | DB                 | ❓ UNKNOWN | Оптимизировать тяжёлые аналитические запросы (индексы/батчи/кэш)                 | Требует EXPLAIN-анализа на живой БД                                                                                                                                                                           |

## 4. Итоги аудита кода (2026-05-21)

### Полностью реализовано (✅ DONE): 9 задач

TASK-001, TASK-002, TASK-005, TASK-008, TASK-011, TASK-012, TASK-015, TASK-021, TASK-025

### Реализовано частично (⚠️ PARTIAL): 9 задач

TASK-003, TASK-009, TASK-010, TASK-013, TASK-018, TASK-019, TASK-022, TASK-023, TASK-027

### Не реализовано (❌ TODO): 8 задач

TASK-006, TASK-007, TASK-014, TASK-016, TASK-020, TASK-026, TASK-028, TASK-029, TASK-030

### Не верифицируется из кода (❓ UNKNOWN): 5 задач

TASK-004, TASK-017, TASK-024, TASK-031, TASK-032

## 5. Приоритизация оставшейся работы

### 5.1 Критические доделки (незакрытые CRITICAL/HIGH)

1. **TASK-003** — стандартизировать XSS-защиту в `AssessmentTheoryView.vue`: вынести `sanitizeContent` в shared util и применить везде, где используется `v-html`.
2. **TASK-006** — реализовать пересчёт статуса `completed_locked` при изменении структуры курса.
3. **TASK-007** — ввести OpenAPI-спецификацию (хотя бы статический файл с ключевыми endpoint).
4. **TASK-018** — добавить `FOR UPDATE` в транзакцию активации инвайта для защиты от race condition.
5. **TASK-010** — завершить MAX-invite deeplinks и `request_contact` сценарии в боте.

### 5.2 Инфраструктура (нет ни одного элемента)

- **TASK-014 + TASK-028** — CI/CD полностью отсутствует: ни тесты в pipeline, ни release gates.
- **TASK-016** — read-replica не начата.

### 5.3 Документация и процессы

- **TASK-026** — создать `docs/operations/` с минимальным deploy/rollback SOP.
- **TASK-019** — завершить согласование стандартов коммитов.
