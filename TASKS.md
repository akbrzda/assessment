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

## ~~Спринт 3 — Напоминания и сертификаты (MVP)~~ ✅ Закрыт

> Реализовано:
>
> - `scheduleReminders` (каждые 4 ч): напоминания о незавершённых курсах, лимит 3 на пару user+course
> - `deadlineReminders` (ежедневно 09:00): напоминания за 7/3/1 день + `deadline_missed` после наступления
> - Миграция 030: таблица `certificates`
> - Модуль `backend/src/modules/certificates/` — routes, controller, repository
> - `backend/src/services/certificates/` — certificateService.js (генерация + retry), pdfGenerator.js (pdfkit, A4 landscape)
> - API: `GET /my`, `GET /:uuid`, `GET /:uuid/download`, `POST /issue`, `POST /:id/revoke`, `GET /` (admin)
> - Подключение к `assessmentEvents.js`: при `result_passed` + `certificate_enabled` → генерация → уведомление `certificate_ready`
> - Cron `retryCertificates` (каждые 15 мин): повтор для `generation_failed`
> - Бот: `/certificate`, `/certificates`, кнопка «📄 Мои сертификаты», `GET /api/bot/internal/certificates`
> - Бот: кнопка «🔔 Уведомления» + вкл/выкл callback; 403 Forbidden → `users.notifications_enabled = false`
> - Backend: `GET/PATCH /api/bot/notifications/settings` для MiniApp; `PATCH /api/bot/internal/notifications/settings` для бота
> - MiniApp: страница «Мои сертификаты» (CertificatesView.vue); ProfileView — навигация на сертификаты, блок настроек уведомлений с toggle
> - Admin Panel: страница «Сертификаты» с фильтрами, таблицей, «Аннулировать»/«Скачать»/«Выдать вручную»
> - Admin Panel: toggle `certificate_enabled` на шаге «Аттестация курса» в редакторе курса

---

## Технические задачи (сквозные)

- [ ] Настроить `node-cron` так чтобы задачи не дублировались при горячей перезагрузке сервера
- [ ] Добавить rate limiting (express-rate-limit) на публичный эндпоинт `GET /api/verify/:uuid`
- [ ] Покрыть `notificationSender.js` и `certificateService.generateCertificate()` unit-тестами
