# Релиз-чеклист: MAX + Telegram Unified Flow

## Перед релизом
1. Прогнать тесты:
- auth: cross-platform, anti-fraud, audit events.
- security: rate-limit и ограничения invite-flow.
2. Проверить миграции на staging.
3. Проверить `MAX_BOT_TOKEN`, `BOT_TOKEN`, `MAX_BOT_NAME`, `BOT_USERNAME`.
4. Проверить, что `TASKS.md` не содержит незавершенных пунктов.

## Smoke на staging
1. Telegram user:
- открыть miniapp,
- пройти invite-flow,
- подтвердить номер,
- убедиться в успешной активации.
2. MAX user:
- открыть miniapp по `startapp`,
- пройти invite-flow,
- подтвердить номер,
- убедиться в успешной активации.
3. Кросс-платформа:
- профиль, активированный в Telegram, открыть из MAX;
- профиль, активированный в MAX, открыть из Telegram.

## Негативные сценарии
1. Неверный `initData` → `401`.
2. Просроченный `auth_date` → `401`.
3. Неверный `contact.source` → `422`.
4. Неверный `contact.userId` → `403`.
5. Несовпадение номера с приглашением → `403`.
6. Повторное использование приглашения в гонке → `409`.

## Мониторинг после выката (первые 24 часа)
1. Ошибки `401`/`403`/`409` на `/api/auth/register`.
2. Рост событий `invite.phone_verification.failed`.
3. Рост событий `identity.auto_link.conflict`.
4. `429` по `/api/admin/auth/login` (ожидаемая защита).
5. p95 latency `/api/auth/register`.

## Критерии отката
1. Массовые `500` на auth/register.
2. Массовые ложные `401` на валидном initData.
3. Неконтролируемый рост конфликтов identity без возможности ручной обработки.
