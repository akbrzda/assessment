# Стратегия read-replica для аналитических запросов

## Цель
Снизить нагрузку на primary MySQL при тяжелых аналитических выборках (`dashboard`, `analytics`, отчеты) без изменения бизнес-логики модулей.

## Принцип
- Все `INSERT/UPDATE/DELETE` остаются на `primary`.
- Только read-only аналитические запросы переводятся на `replica`.
- Если replica недоступна, запрос автоматически переключается на `primary` (graceful fallback).

## План внедрения
1. Добавить второй пул подключения в `backend/src/config/database.js`: `readPool`.
2. Вынести helper `getReadConnection({ strongConsistency })`:
- `strongConsistency=true` всегда читает с `primary`.
- Иначе читает с `replica` и fallback на `primary`.
3. Поэтапно перевести репозитории:
- `modules/admin/dashboard/*`
- `modules/analytics/*`
- `modules/courses/courseAnalytics.repository.js`
4. Добавить метрики:
- доля чтений с replica,
- число fallback на primary,
- latency p95/p99 для аналитики.
5. Запустить shadow-режим на staging: двойное чтение (primary+replica) и сравнение агрегатов.

## Ограничения
- Для критичных после-записи экранов используем `strongConsistency=true`.
- В read-replica нельзя выполнять запросы с блокировками (`FOR UPDATE`).
- Порог acceptable replication lag: до 3 секунд для дашбордов.

## Definition of Done
- Аналитические эндпоинты читают из replica по умолчанию.
- При недоступности replica нет ошибок 5xx из-за чтений.
- Наблюдаемость показывает стабильное снижение нагрузки на primary.
