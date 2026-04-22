# План поставки модуля «Курсы»

Обновлено: 22.04.2026

## Sprint 0 — Выравнивание (закрыт)

- Зафиксировано: `section`/`topic` в БД — техническое наследие, переименование схемы не выполняется.
- Зафиксировано: для сортировки в админке используется нативный HTML5 Drag and Drop (без новой зависимости).
- Зафиксировано: пересчёт `completed_locked` выполняется асинхронно через фоновые задания, не в request-потоке.
- Зафиксировано: геймификация за завершение курса вынесена за рамки Sprint 1-2.
- Зафиксировано: версия курса хранится как свободное текстовое поле в черновике.
- Спроектирована таблица `course_drafts` (см. миграцию `016_add_courses_sprint1_fields.sql`).
- Согласованы API-контракты Sprint 1-2 (см. `docs/courses_api_contracts.md`).

## Sprint 1 — Foundation UI + миграции (выполнено в итерации)

- Добавлены миграционные поля для курсов: `cover_url`, `category`, `tags`.
- Добавлены поля трекинга подтемы: `started_at`, `last_completed_order`.
- Добавлена таблица `course_drafts`.
- Добавлены пользовательские API:
  - `POST /courses/:courseId/topics/:topicId/start`
  - `POST /courses/:courseId/topics/:topicId/complete`
- Добавлены UI-компоненты:
  - admin: `DraftSaveIndicator`, `AnalyticsSummaryCards`
  - frontend: `CourseCard`, `ProgressBar`, `StatusBadge`, `LockBadge`, `BottomSheet`

## Sprint 2 — Пользовательский flow (часть 1, закрыт)

- Расширен `GET /courses`: добавлено поле `topicsCount` (вместе с `testsCount`).
- Расширен `GET /courses/:id`: добавлены `lockReasonType` и `lockReasonText` для тем/подтем.
- Добавлен endpoint `GET /courses/:courseId/sections/:sectionId` для страницы темы.
- Добавлена страница `TopicView.vue` со списком подтем.
- Добавлен компонент `SubtopicItem.vue` со статусами:
  - `not_started`
  - `in_progress`
  - `completed`
  - `completed_locked`
  - `locked`
- Обновлён `CourseDetailsView.vue`: добавлен переход на отдельную страницу темы курса.
- Для списка курсов во вкладке «Курсы» добавлены явные состояния `loading/empty/error` и кнопка повторной загрузки.
- Добавлен `StickyFooterCTA` на странице курса для сценариев «Начать прохождение» и «Продолжить курс».
- Расширен набор QA-кейсов Sprint 2 в `docs/courses_sprint2_qa_testcases.md`.

## Примечание по `course_change_log`

Отдельная таблица `course_change_log` не добавлялась, так как логирование изменений покрывается существующим `auditService`.
