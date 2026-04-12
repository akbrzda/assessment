# Assessment — roadmap наведения порядка в кодовой базе

## Цель roadmap

Этот roadmap нужен не для добавления новых фич.
Он нужен для того, чтобы:

- остановить рост технического долга;
- довести архитектурную миграцию до конца;
- сделать кодовую базу читаемой и предсказуемой;
- закрепить единые правила поддержки.

Фокус:

- читаемость;
- структура слоёв;
- инженерная дисциплина;
- снижение дублирования;
- улучшение сопровождения.

Переход на TypeScript в этот roadmap **не входит**.

---

## Принципы выполнения

1. Сначала выравниваем базу качества.
2. Потом режем самые дорогие точки перегруза.
3. Потом добиваем архитектурную консистентность.
4. Только после этого усиливаем тесты и полируем DX.

Нельзя делать наоборот.

---

## Этап 0. Заморозка хаоса

Срок: 1 день

### Задачи

- Зафиксировать стандарт кода в `docs/`.
- Принять правило: новые backend-домены писать только через `modules/<domain>/`.
- Запретить новые большие файлы без аргументации.
- Запретить добавление новых `console.*` в production code.

### Результат

Команда перестаёт увеличивать хаос, пока идёт уборка.

---

## Этап 1. Базовая инженерная инфраструктура

Срок: 2–3 дня

### Что делаем

Для `backend`, `admin-frontend`, `frontend`, `bot`:

- добавить ESLint;
- добавить Prettier;
- добавить `.editorconfig`;
- добавить `lint`, `format`, `format:check`;
- добавить Husky + lint-staged;
- привести код к читаемому форматированию одним отдельным коммитом.

### Почему это первый этап

Сейчас repo умеет деплоиться, но не умеет автоматически удерживать качество.
Если сначала начать рефакторить архитектуру без formatter/linter, код быстро снова расползётся.

### Критерий готовности

Во всех сервисах есть одинаково понятный набор команд:

```bash
npm run lint
npm run format:check
npm run build
```

---

## Этап 2. Источники правды: docs, env, workflows

Срок: 1–2 дня

### Что делаем

- проверить каждый `.env.example`;
- сверить env-переменные с реальным кодом и workflow;
- убрать fallback secrets из backend `env.js`;
- добавить явную валидацию env на старте;
- описать обязательные env-переменные в docs;
- привести README/`domens.md`/`docs/` к одному состоянию.

### Почему это важно

Сейчас проект сложно безопасно сопровождать, если:

- конфиг не является источником правды;
- секреты имеют fallback;
- документация и реальное поведение расходятся.

### Критерий готовности

- ни один секрет не имеет production fallback;
- каждая env-переменная из кода описана;
- workflow и `.env.example` не расходятся.

---

## Этап 3. Backend: остановка legacy-роста и завершение модульной миграции

Срок: 4–6 дней

### Что делаем

1. Формально объявить legacy-папки `controllers/` и `routes/` зоной миграции.
2. Новые изменения в доменах вносить только через `modules/<domain>/`.
3. Для каждого крупного домена создать целевую структуру:

```text
modules/<domain>/
  routes.js
  controller.js
  service.js
  repository.js
  validators.js
```

4. Перенести по очереди:

- auth
- invitations
- assessments
- theory/courses
- gamification
- leaderboard

### Порядок миграции

Приоритет такой:

1. auth
2. invitations
3. assessments
4. analytics extensions
5. gamification / leaderboard
6. secondary admin domains

### Правила миграции

- сначала копируем и стабилизируем поведение;
- потом режем ответственность по слоям;
- только потом чистим naming и внутренние интерфейсы.

### Нельзя

- одновременно переписывать бизнес-логику и менять API-контракт без необходимости;
- переносить SQL в service;
- оставлять наполовину migrated домен в двух местах без явного плана.

### Критерий готовности

- у приоритетных доменов нет бизнес-логики в route handlers;
- SQL лежит в repository;
- controller тонкий;
- validators централизованы.

---

## Этап 4. Backend runtime hardening

Срок: 1–2 дня

### Что делаем

- добавить `helmet`;
- добавить rate limiting для auth и чувствительных API;
- проверить CORS allowlist;
- добавить явный graceful shutdown;
- стандартизировать error responses;
- привести логирование к одному формату;
- убрать оставшиеся `console.*` из backend.

### Почему не раньше

Сначала нужно расчистить слои и конфиги. Потом уже усиливать runtime.

### Критерий готовности

Backend entrypoint становится коротким, понятным и безопасным по умолчанию.

---

## Этап 5. Admin frontend: разрезать session/auth orchestration

Срок: 3–4 дня

### Текущая проблема

Логика сессии размазана между:

- `stores/auth.js`;
- `utils/axios.js`;
- websocket service;
- router guards.

### Что делаем

Создаём единый слой, например:

```text
src/services/session/
  sessionService.js
  tokenStorage.js
  refreshCoordinator.js
  websocketSessionBridge.js
```

### После этого

- `auth store` хранит состояние пользователя и permissions;
- axios interceptor вызывает только `refreshCoordinator`;
- websocket service не решает сам, как логиниться заново;
- router не занимается refresh logic.

### Что ещё делаем

- вынести route guards в отдельные файлы;
- разбить router на модульные `*.routes.js`;
- оставить lazy imports;
- сократить количество побочных эффектов при старте приложения.

### Критерий готовности

В проекте есть один источник правды для сессии.

---

## Этап 6. Admin frontend: упростить клиентскую инфраструктуру

Срок: 2–3 дня

### Что делаем

- пересмотреть кастомный cache layer в axios;
- убрать магию, которую сложно тестировать;
- оставить только тот кеш, у которого есть понятные правила инвалидции;
- вынести cache policy в отдельный документ;
- уменьшить количество скрытых зависимостей между utils/store/services.

### Решение

Если слой нельзя объяснить в 5 предложениях, он слишком сложный для текущего проекта.

### Критерий готовности

HTTP-клиент становится предсказуемым, а не «умным, но хрупким».

---

## Этап 7. Mini App: убрать скрытые глобалы и расчистить Telegram-слой

Срок: 3 дня

### Текущая проблема

Состояние Telegram частично разносится через глобальные `window.__*`, а route guard и store знают слишком много.

### Что делаем

Создаём явный слой:

```text
src/services/telegram/
  telegramBridge.js
  telegramStorage.js
  telegramInitState.js
  inviteContext.js
```

### После этого

- `telegram store` управляет только состоянием платформы;
- API-клиент не читает случайные глобалы;
- invite/initData/startParam хранятся в одном месте;
- router проверяет только готовый нормализованный state.

### Дополнительно

- разделить user/session state и platform state;
- проверить guards на лишние редиректы и повторные загрузки;
- убрать лишние `console.*`.

### Критерий готовности

Mini App сохраняет Telegram-специфику, но теряет скрытые зависимости.

---

## Этап 8. Bot: превратить bootstrap в сервис

Срок: 1–2 дня

### Что делаем

Разбиваем `bot/src/index.js` на:

```text
src/
  index.js
  config/
  handlers/
  messages/
  services/
```

### После этого

- `index.js` только запускает бота;
- deep-link логика лежит отдельно;
- welcome message и keyboard не смешаны со стартом процесса;
- логирование и обработка ошибок приведены к backend-стилю.

### Критерий готовности

Bot перестаёт быть одним большим bootstrap-файлом.

---

## Этап 9. Тестовый baseline

Срок: 3–5 дней

### Что делаем

Backend:

- integration tests для auth;
- permission checks;
- invitation flow;
- basic assessment flow.

Admin frontend:

- login/logout;
- refresh flow;
- route access by permissions.

Mini App:

- auth bootstrap;
- invite flow;
- route guard сценарии.

Bot:

- start payload parsing;
- invite deep-link parsing.

### Важно

Сначала покрываются только критичные сценарии.
Не надо пытаться покрыть всё.

### Критерий готовности

Любое серьёзное изменение в auth/session/permissions не может пройти незаметно.

---

## Этап 10. Cleanup pass

Срок: 2 дня

### Что делаем

- удалить мёртвый код;
- убрать дублирующиеся helpers;
- выровнять naming;
- унифицировать импорт-стиль;
- добавить JSDoc в сложные места;
- сократить вложенность и условия там, где это возможно;
- проверить, что после рефакторинга docs всё ещё актуальны.

### Критерий готовности

Репозиторий читается как единая кодовая база, а не как набор разных эпох разработки.

---

## Приоритеты по файлам и зонам риска

### Самые дорогие зоны

1. `backend/src/controllers/*` и `backend/src/routes/*`
2. `admin-frontend/src/stores/auth.js`
3. `admin-frontend/src/utils/axios.js`
4. `admin-frontend/src/router/index.js`
5. `frontend/src/stores/telegram.js`
6. `frontend/src/router/index.js`
7. `bot/src/index.js`
8. `backend/src/config/env.js`

### Почему именно они

Потому что в них сейчас сосредоточены:

- смешанные ответственности;
- высокая связанность;
- скрытые побочные эффекты;
- большой риск регрессий;
- проблемы читаемости.

---

## Что не делать

Не делать сейчас:

- массовую перепись всего проекта за один раз;
- одновременную смену архитектуры и API-контрактов;
- переход на TypeScript;
- переписывание ради «красоты» без измеримой пользы;
- добавление новых инфраструктурных слоёв без крайней необходимости.

---

## Как понять, что roadmap дал результат

Признаки успеха:

- новые backend-фичи идут только через `modules/<domain>/`;
- session/auth logic в admin имеет один центр управления;
- miniapp больше не опирается на скрытые глобалы;
- bot перестал быть монолитным bootstrap;
- все сервисы проходят lint/format/build;
- критичные сценарии защищены тестами;
- код читается по слоям, а не по случайным переходам между файлами.

---

## Рекомендуемый порядок коммитов

1. `chore: add lint format editorconfig hooks`
2. `chore: normalize code formatting`
3. `chore: align env examples and workflow variables`
4. `security: remove fallback secrets and validate env`
5. `refactor: extract backend domain modules`
6. `refactor: centralize admin session management`
7. `refactor: simplify admin http client and cache`
8. `refactor: isolate telegram bridge and invite context`
9. `refactor: split bot bootstrap into handlers and services`
10. `test: add critical auth and invitation coverage`
11. `chore: cleanup dead code and unify naming`
