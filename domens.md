# План рефакторинга по доменам (целевая архитектура)

## Цель

Привести проект к модульной архитектуре по образцу:

```text
backend/src/
  config/
  middleware/
  modules/
    admin/
      assessments/
        assessments.controller.js
        assessments.repository.js
        assessments.service.js
        assessments.validators.js
        routes.js
        index.js
      branches/
        branches.controller.js
        branches.repository.js
        branches.service.js
        branches.validators.js
        routes.js
        index.js
      positions/
        positions.controller.js
        positions.repository.js
        positions.service.js
        positions.validators.js
        routes.js
        index.js
      references/
        references.controller.js
        references.repository.js
        references.service.js
        routes.js
        index.js
      index.js
    analytics/
      controller.js
      repository.js
      service.js
      validators.js
      routes.js
      index.js
```

## Правила модульного слоя

- `routes.js`: только маршруты, middleware и вызов контроллера
- `*.controller.js`: только HTTP-вход/выход, без SQL и бизнес-правил
- `*.service.js`: бизнес-правила и orchestration
- `*.repository.js`: только доступ к данным
- `*.validators.js`: валидация/нормализация входа
- `index.js`: единая точка входа модуля

## Текущий прогресс

### Завершено

- [x] Перенос `admin/references` в целевую структуру
- [x] Перенос `admin/positions` в целевую структуру
- [x] Перенос `admin/branches` в целевую структуру
- [x] Перенос `analytics` в модуль
- [x] Перенос `admin/assessments` read-контура (`GET /admin/assessments`, `GET /admin/assessments/:id`)
- [x] Переключение адаптеров роутов на новую структуру модулей

### В работе

- [ ] `admin/assessments` write-контур:
- [ ] create/update/delete
- [ ] export/details/progress
- [ ] перенос транзакций из контроллера в сервис

## Дополнительные задачи

### Архитектурные

- [ ] Добавить `index.js`-агрегаторы для всех backend-модулей
- [ ] Убрать прямые подключения legacy `controllers/*` после миграции домена
- [ ] Ввести единый нейминг доменных файлов для всех новых модулей
- [ ] Разделить крупные use-case в `admin/assessments` на отдельные сервисы (read/write/export)

### Качество и стандарты

- [ ] Убрать `console.*` из backend runtime-кода, перевести на единый logger
- [ ] Ввести единый формат доменных ошибок (`code`, `httpStatus`, `message`, `details`)
- [ ] Добавить lint-правило на запрет SQL в `routes`/`controllers`
- [ ] Добавить lint-правило на запрет файлов > 350 строк для новых модулей

### Тестирование

- [ ] Добавить smoke-интеграцию на `admin references/positions/branches`
- [ ] Добавить интеграционные тесты на read-контур `admin/assessments`
- [ ] Добавить интеграционные тесты на `analytics` (`summary`, `branches`, `employees`, `export`)
- [ ] Добавить регресс-тесты на обратную совместимость API-контрактов

### Frontend и bot (следующие этапы)

- [ ] Перевести `admin-frontend` на `modules/<domain>/{api,stores,views,components}`
- [ ] Разбить router `admin-frontend` на `routes/*` + `guards/*`
- [ ] Перевести `frontend` на модульный API-слой и тонкие `views`
- [ ] Разбить `bot/src/index.js` на `modules`, `handlers`, `service`, `validators`

## Критерии готовности этапа backend

- [ ] Все новые backend-домены лежат в `modules/*` и имеют `index.js`
- [ ] В migrated-доменах нет SQL в `routes` и `controllers`
- [ ] Все migrated-роуты сохраняют текущие URL и формат ответа
- [ ] В migrated-доменах нет `console.*` в runtime
- [ ] Есть минимум smoke/integration покрытие на migrated-домены
