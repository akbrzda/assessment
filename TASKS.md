# Текущие задачи

---

## ~~Спринт 1 — Фундамент уведомлений и онбординга~~ ✅ Закрыт

> Реализовано:
>
> - Миграции 027 (bot_notifications), 028 (notification_settings в users), 029 (certificate_enabled в courses + system_settings)
> - `notificationService.js` — CRUD по bot_notifications с дедупликацией
> - `notificationSender.js` — отправка через Telegram Bot API: throttling, retry 429, blocked 403
> - `notificationScheduler.js` — планировщик на setInterval (pending/5 мин, failed/30 мин, reminders/4 ч, deadline/24 ч); заглушки scheduleReminders и deadlineReminders
> - Модуль `backend/src/modules/bot/` — routes (public + internal), controller, service, repository
> - Middleware `verifyBotToken.js` — авторизация internal endpoint по BOT_TOKEN
> - `GET /api/bot/internal/user-status` — для проверки онбординга из бота
> - `GET/PATCH /api/bot/notifications/settings` — управление уведомлениями из MiniApp
> - `POST /api/auth/onboarding/complete` — уже существовал, переиспользован
> - Бот: расширен /start с проверкой onboarding_completed_at, меню, кнопки «Сертификаты»/«Уведомления»
> - MiniApp: уже вызывал completeOnboarding() — задача закрыта без изменений

---

## Спринт 3 — Напоминания и сертификаты (MVP)

> Цель: завершить MVP — напоминания о незавершённых курсах и выдача PDF-сертификатов.

### Backend — напоминания

- [ ] Реализовать cron `scheduleReminders` (каждые 4 часа): найти пользователей с незавершёнными курсами без напоминания за последние 24 часа, создать `bot_notifications` (type: `course_reminder`)
- [ ] Реализовать cron `deadlineReminders` (каждый день в 08:00 UTC+3): найти курсы с `close_at` через 7/3/1 день, создать `bot_notifications` (type: `deadline_reminder`) для пользователей с прогрессом < 100%
- [ ] После наступления `close_at`: отправить `deadline_missed` пользователям у которых курс не завершён (одно уведомление)
- [ ] Ограничение: не более 3 напоминаний на курс на пользователя (без дедлайна); с дедлайном — до 3 по расписанию

### Backend — сертификаты (модуль)

- [ ] Создать миграцию `030`: таблица `certificates` (uuid, user_id, course_id, attempt_id, status, issued_at, revoked_at, revoked_by, file_path, file_url, score_percent, snapshot_data)
- [ ] Создать модуль `backend/src/modules/certificates/` (routes.js, controller.js, service.js, repository.js)
- [ ] Реализовать `GET /api/public/certificates/my` — список сертификатов текущего пользователя
- [ ] Реализовать `GET /api/public/certificates/:uuid` — метаданные сертификата по UUID
- [ ] Реализовать `GET /api/public/certificates/:uuid/download` — отдать PDF файл (Content-Type: application/pdf)
- [ ] Реализовать `POST /api/admin/certificates/:id/revoke` — аннулировать сертификат
- [ ] Реализовать `POST /api/admin/certificates/issue` — ручная выдача сертификата администратором
- [ ] Реализовать `GET /api/admin/certificates` — список с фильтрами (userId, courseId, status, page, limit)

### Backend — генерация PDF

- [ ] Согласовать и установить библиотеку для PDF (puppeteer или pdf-lib — см. Технические задачи)
- [ ] Создать `backend/src/services/certificates/pdfGenerator.js` — рендер HTML-шаблона в PDF
- [ ] Создать дефолтный шаблон `backend/templates/certificate.default.html` с полями: логотип, ФИО, курс, дата, UUID, URL верификации
- [ ] Реализовать `certificateService.generateCertificate(userId, courseId, attemptId)`: сгенерировать UUID, заполнить `snapshot_data` (ФИО, курс, дата, результат), рендерить PDF, сохранить файл, записать в БД
- [ ] Сохранение PDF: локально в `backend/uploads/certificates/` (MVP); путь настраивается через env
- [ ] Cron `retryCertificates` (каждые 15 минут): повторить генерацию для `status = 'generation_failed'`
- [ ] Подключить генерацию к `assessmentEvents.js`: при `result_passed` → вызвать `generateCertificate` → после успеха создать `bot_notifications` (type: `certificate_ready`)

### Bot — сертификаты

- [ ] Добавить обработчик команды `/certificate`: найти последний сертификат пользователя по `telegram_id`, отправить PDF файлом через `bot.sendDocument()`
- [ ] Добавить обработчик команды `/certificates`: отправить список сертификатов с inline-кнопками «Скачать» для каждого

### Bot — настройки уведомлений

- [ ] Добавить обработчик кнопки «Уведомления» в меню: отправить текущий статус + кнопки «Выключить уведомления» / «Включить уведомления»
- [ ] При нажатии на кнопку выкл/вкл: вызвать `PATCH /api/public/notifications/settings`, подтвердить пользователю
- [ ] Обрабатывать ошибку `403 Forbidden` от Telegram (пользователь заблокировал бота): обновлять `users.notifications_enabled = false`

### Backend — настройки уведомлений пользователя

- [ ] Реализовать `GET /api/public/notifications/settings`
- [ ] Реализовать `PATCH /api/public/notifications/settings` (notifications_enabled, quiet_start, quiet_end)

### MiniApp — сертификаты

- [ ] Добавить страницу «Мои сертификаты»: список выданных сертификатов с датой, названием курса, кнопкой «Скачать»
- [ ] Добавить настройки уведомлений в профиль пользователя (включить/выключить)

### Admin Panel — сертификаты

- [ ] Добавить страницу «Сертификаты»: таблица с фильтрами по курсу, пользователю, статусу
- [ ] Действия на строке: «Аннулировать», «Скачать»
- [ ] Кнопка «Выдать вручную» — модальное окно с выбором пользователя и курса
- [ ] Добавить поле `certificate_enabled` (toggle) на форму/карточку курса

---

## Технические задачи (сквозные)

- [ ] Выбрать библиотеку генерации PDF: `puppeteer` vs `pdf-lib` — принять решение до начала Спринта 3
- [ ] Убедиться что `users.telegram_id` используется как `chat_id` для отправки сообщений — проверить на тестовом аккаунте в Спринте 1
- [ ] Настроить `node-cron` так чтобы задачи не дублировались при горячей перезагрузке сервера
- [ ] Добавить rate limiting (express-rate-limit) на публичный эндпоинт `GET /api/verify/:uuid`
- [ ] Добавить логирование ошибок Telegram API в `logs/` (уже есть директория в проекте)
- [ ] Покрыть `notificationSender.js` и `certificateService.generateCertificate()` unit-тестами

## Открытые вопросы (требуют ответа до начала Спринта 2)

- [ ] Уточнить: курсы назначаются всем сотрудникам или по филиалу/должности? → по филиалу/должности
- [ ] Уточнить: хранить PDF сертификаты локально или в AWS S3 (интеграция уже есть для бейджей)? - локально
- [ ] Уточнить: `assessments.close_at` vs `courses.close_at` — какой дедлайн приоритетнее для напоминаний? — `courses.close_at`
- [ ] Уточнить: нужны ли уведомления менеджеру в бот в рамках MVP или только Admin Panel? - нет, только Admin Panel
