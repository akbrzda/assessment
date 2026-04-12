# План рефакторинга по доменам

## Цель

Привести backend к модульной архитектуре в формате:

```text
backend/src/
  config/
  middleware/
  modules/
    admin/
      <domain>/
        <domain>.controller.js
        <domain>.service.js
        <domain>.repository.js      # где есть работа с БД
        <domain>.validators.js      # где есть валидация
        routes.js
        index.js
      shared/
        legacy-handler-adapter.js
      index.js
    <public-domain>/
      controller.js
      service.js
      repository.js
      validators.js
      routes.js
      index.js
```

## Правила слоя

- `routes.js`: только маршруты, middleware и вызов контроллера
- `*.controller.js`: HTTP-вход/выход
- `*.service.js`: бизнес-логика и orchestration
- `*.repository.js`: доступ к данным
- `*.validators.js`: валидация и нормализация
- `index.js`: единая точка входа модуля

## Охват backend (все модули)

### Уже перенесено в `modules/*`

- [x] `admin/auth`
- [x] `admin/dashboard`
- [x] `admin/users`
- [x] `admin/references`
- [x] `admin/positions`
- [x] `admin/branches`
- [x] `admin/assessments`
- [x] `admin/question-bank`
- [x] `admin/analytics`
- [x] `admin/settings`
- [x] `admin/gamification-rules`
- [x] `admin/invitations`
- [x] `admin/profile`
- [x] `admin/permissions`
- [x] `admin/courses`
- [x] `admin/badges`
- [x] `admin/levels`
- [x] `admin/legacy`
- [x] `analytics`

### Еще не перенесено (backend)

- [ ] `auth` (публичный/miniapp контур)
- [ ] `invitations` (публичный/miniapp контур)
- [ ] `assessments` (пользовательский контур)
- [ ] `cloud-storage`
- [ ] `gamification`
- [ ] `leaderboard`
- [ ] `courses` (пользовательский контур, унификация с admin)

## Текущий прогресс

### Выполнено

- [x] Все admin-маршруты перенесены в `backend/src/modules/admin/*`
- [x] Удалены fallback-файлы из `backend/src/routes/*` для уже мигрированных admin-разделов
- [x] `app.js` переключен на подключение модулей из `modules/*`
- [x] `admin/assessments` переведен на модульный контур, включая write-часть
- [x] Добавлен `shared/legacy-handler-adapter` для безопасной обертки legacy-контроллеров
- [x] Для admin-разделов добавлены модульные `service + controller + routes`
  - [x] `auth`
  - [x] `dashboard`
  - [x] `users`
  - [x] `question-bank`
  - [x] `settings`
  - [x] `analytics`
  - [x] `gamification-rules`
  - [x] `invitations`
  - [x] `permissions`
  - [x] `courses`
  - [x] `badges`
  - [x] `levels`
  - [x] `profile`
  - [x] `legacy`

### В работе

- [x] `admin/assessments`: декомпозиция `assessments.write.service` на отдельные use-case сервисы и repository-операции
- [x] `admin/assessments`: вынести `adminTheoryController` из `routes` в модульный слой `service/controller`
- [x] `admin/*`: поэтапно убрать зависимости от `backend/src/controllers/*` внутри `*.service.js` (полная независимость модулей)

## Следующие итерации

### Итерация A — Закрытие admin до конца

- [x] Убрать прямые импорты legacy-контроллеров из `admin/*/service.js` через перенос логики в модульные сервисы
- [x] Выделить repository-слой там, где в сервисах остаются SQL/модельные вызовы
- [x] Привести нейминг файлов к единому виду во всех admin-доменах
- [x] Добавить smoke-тесты на ключевые admin-endpoint'ы

### Итерация B — Публичные backend-домены

- [ ] Перенести `auth` в `modules/auth`
- [ ] Перенести `invitations` в `modules/invitations`
- [ ] Перенести пользовательский `assessments` в `modules/assessments`
- [ ] Перенести `leaderboard`, `gamification`, `cloud-storage`
- [ ] Унифицировать `courses` (admin + user) по единому доменному контракту

### Итерация C — Качество и стандарты

- [ ] Убрать `console.*` из runtime-кода и перейти на единый logger
- [ ] Ввести единый формат ошибок (`code`, `httpStatus`, `message`, `details`)
- [ ] Зафиксировать lint-ограничения: без SQL в `routes/controllers` и без новых крупных файлов
- [ ] Добавить интеграционные тесты для migrated-доменов

## Критерии готовности backend-этапа

- [ ] Все backend-домены лежат в `modules/*` и имеют `index.js`
- [ ] В migrated-доменах нет fallback-подключений старых route-файлов
- [ ] В migrated-доменах нет SQL в `routes/controllers`
- [ ] Контракты API сохранены (URL и формат ответов)
- [ ] Есть минимальное smoke/integration покрытие на критичные домены


