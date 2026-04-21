# Закрытие фаз 0 и 1 (Roadmap)

Дата: 2026-04-21

## Что закрыто

### Фаза 0 — Диагностика и немедленные меры
- Добавлен скрипт `backend/scripts/phase0-diagnostics.js`
- Добавлен npm-скрипт `npm run phase0:diagnostics`
- Проверки скрипта:
  - наличие `JWT_SECRET` и `JWT_REFRESH_SECRET`
  - наличие и состав `ALLOWED_ORIGINS`
  - наличие/отсутствие маршрута `/registration` в клиентском роутере
  - поиск зависших `in_progress` попыток старше суток
  - список аттестаций с активными `in_progress` попытками
  - сводка по matching-вопросам и попыткам

### Фаза 1 — Критические исправления
- Исправлен дефект ветвления matching в движке ответов через единую функцию `scoreAnswer`
- Устранено дублирование логики `saveAnswer` / `saveAnswersBatch`
- Добавлены unit-тесты `backend/tests/assessment.score-answer.test.js`
- Усилена защита от гонок в `createAttempt`:
  - блокировка аттестации `FOR UPDATE`
  - проверка активной попытки `FOR UPDATE` после блокировки
- Перенесено автозавершение истекших попыток в фоновый планировщик:
  - `backend/src/services/attemptMaintenanceService.js`
  - запуск при старте сервера
  - удалены вызовы `cancelExpiredAttempts` из публичных контроллеров
- Добавлен fail-fast для production при пустом `ALLOWED_ORIGINS`
- WebSocket переведен на ту же политику `allowedOrigins` с fail-fast в production
- Добавлена проверка `auth_date` Telegram initData (окно 5 минут)
- В `canEditUser` добавлена проверка филиала менеджера
- Закрыт маршрут `/registration` в `frontend` (удален из роутера и навигационных редиректов)
- Добавлен скрипт dry-run/применения перерасчета matching:
  - `backend/scripts/recalculate-matching-attempts.js`
  - `npm run phase1:recalculate-matching`

## Проверки, выполненные локально
- `npm run test:assessment` — успешно
- `npm run test:smoke:admin` — успешно
- `npm run phase0:diagnostics` — успешно
- `npm run phase1:recalculate-matching` (dry-run) — успешно

## Как применить перерасчет matching в БД
1. Сначала dry-run:
   - `npm run phase1:recalculate-matching`
2. Затем применение:
   - `node scripts/recalculate-matching-attempts.js --apply`
