# Runbook: MAX + Telegram (Production Support)

## Цель
Оперативно диагностировать и устранять инциденты в едином потоке авторизации и invite-flow для MAX и Telegram.

## Базовая проверка
1. Проверить health: `GET /api/health`.
2. Проверить наличие новых 4xx/5xx по маршрутам:
`/api/auth/status`, `/api/auth/register`, `/api/cloud-storage/*`.
3. Проверить заголовки клиента:
- `x-client-platform`
- `x-telegram-init-data` или `x-max-init-data`.

## Частые инциденты и действия
1. `401 Invalid initData`
- Проверить корректность `initData` и срок `auth_date`.
- Для MAX убедиться, что установлен `MAX_BOT_TOKEN`.
- Для Telegram убедиться, что установлен `BOT_TOKEN`.

2. `403 Номер телефона не совпадает с приглашением`
- Проверить `invitations.phone` и нормализованный номер из `contact`.
- Проверить аудит-событие `invite.phone_verification.failed`.

3. `409 Обнаружен конфликт профилей по номеру телефона`
- Открыть `/api/admin/users/:id/stats`.
- Проверить `identityDiagnostics.phoneConflict`.
- Зафиксировать конфликт в операционном журнале и передать на ручное слияние данных.

4. `409 Приглашение уже использовано в другом сеансе`
- Это нормальная защита от гонки.
- Проверить, какой user уже привязан к приглашению (`invitations.used_by`).

## Диагностика identity-конфликтов
1. Запустить:
`npm run sprint4:dedupe-identities`
2. Зафиксировать список конфликтов из stdout.
3. Для каждого телефона:
- проверить профили в `users`,
- проверить `user_platform_identities`,
- согласовать целевой профиль с бизнес-владельцем.

## Критичные метрики мониторинга
1. Доля `401` на `/api/auth/status` и `/api/auth/register`.
2. Частота `invite.phone_verification.failed`.
3. Частота `identity.auto_link.conflict`.
4. Частота `429` на `/api/admin/auth/login`.
5. Время ответа p95 на `/api/auth/register`.

## Эскалация
1. P1: массовые `401`/`500` на auth — эскалация backend on-call немедленно.
2. P2: рост `identity.auto_link.conflict` — эскалация владельцу данных и support lead.
3. P3: единичные конфликты — обработка по runbook в рабочем порядке.
