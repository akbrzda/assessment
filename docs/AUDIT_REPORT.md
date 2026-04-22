# Аудит проекта assessment

Дата: 2025-02-14

## Область аудита

Проанализированы модули:
- backend (Express + MySQL + Socket.IO)
- bot (Telegraf)
- frontend (MiniApp)
- admin-frontend (админ-панель)
- CI/CD (GitHub Actions)
- миграции БД
- зависимости (npm audit)

## Краткая сводка

Проект в целом структурирован и использует подготовленные SQL-запросы, есть базовая модульная организация и точка входа для WebSocket. Основные риски сосредоточены в безопасности авторизации/сессий (CORS+cookies, хранение токенов, отсутствие защиты от CSRF/брютфорса), конфигурации секретов (фолбэк-ключи), отсутствии ограничений на объемы выборок и некоторых несоответствиях ролей/доступов. По производительности — проблемная зона в отсутствие пагинации и в использовании in-memory кеша без учета пользователя.

## Критичность и классификация

### Критично

1) **Фолбэк секреты для JWT**
- Где: `backend/src/config/env.js`, `backend/src/middleware/verifyJWT.js`, `backend/src/controllers/adminAuthController.js`.
- Суть: при отсутствии переменных окружения используется строка по умолчанию (`your_secret_key_here`, `your_refresh_secret_key_here`). Это приводит к возможности подделки токенов при неверной конфигурации окружения.
- Риск: компрометация админ-доступа и всех JWT-подписанных API.
- Рекомендация: убрать фолбэки, валидировать конфиг и аварийно завершать запуск при отсутствии секретов.

2) **CORS с credentials и открытый origin**
- Где: `backend/src/app.js`.
- Суть: если `ALLOWED_ORIGINS` не задан, `origin: true` позволяет любой origin, при этом `credentials: true` разрешает куки.
- Риск: CSRF и утечка данных через межсайтовые запросы (особенно для `admin/auth/refresh`).
- Рекомендация: всегда задавать явный список доверенных origin, блокировать `origin: true` для продакшн.

3) **Нет защиты от CSRF для refresh-cookie**
- Где: `backend/src/controllers/adminAuthController.js`, `admin-frontend/src/utils/axios.js`.
- Суть: refresh токен хранится в cookie, `SameSite=none` (prod), нет CSRF-токена/проверки Origin/Referer.
- Риск: атаки на refresh (подмена, генерация access-token) при уязвимом CORS или XSS.
- Рекомендация: добавить CSRF защиту (double submit cookie или проверку Origin/Referer), ужесточить CORS.

### Высокая

4) **Хранение access-token в localStorage**
- Где: `admin-frontend/src/utils/axios.js`, `admin-frontend/src/stores/auth.js`.
- Суть: при XSS токен будет похищен.
- Риск: захват аккаунта администратора.
- Рекомендация: хранить access-token в памяти процесса, refresh — только в HttpOnly cookie. Добавить CSP.

5) **Недостаточная защита от перебора логинов**
- Где: `backend/src/controllers/adminAuthController.js`.
- Суть: отсутствует rate-limiting/lockout на `/admin/auth/login`.
- Риск: подбор паролей админов.
- Рекомендация: внедрить rate limiting (например, `express-rate-limit`), задержку/блокировку после N неудачных попыток.

6) **Проверка Telegram initData без контроля давности**
- Где: `backend/src/services/telegramAuthService.js`.
- Суть: проверяется HMAC, но отсутствует контроль `auth_date` (окна времени).
- Риск: replay-атаки при утечке initData.
- Рекомендация: валидировать `auth_date` (например, <= 5 минут).

7) **Отсутствие проверки филиала в canEditUser**
- Где: `backend/src/middleware/canEditUser.js`.
- Суть: менеджер может редактировать любого employee, а не только своего филиала (в комментарии заявлено обратное).
- Риск: горизонтальная эскалация и изменение пользователей других филиалов.
- Рекомендация: добавить проверку `branch_id`.

### Средняя

8) **Кеширование без привязки к пользователю**
- Где: `backend/src/middleware/cache.js`, использовано в `backend/src/routes/adminUsersRoutes.js`.
- Суть: ключи кеша не учитывают пользователя/роль; в некоторых случаях это может вернуть данные, рассчитанные для другого пользователя.
- Риск: утечки данных при разном наборе прав.
- Рекомендация: включать `req.user.id`/роль в ключ, либо отключить кеш для пользовательских данных.

9) **Отсутствие пагинации в админ-выборках**
- Где: `backend/src/controllers/adminUserController.js` (`listUsers`, `exportUsersToExcel`) и другие списки.
- Суть: выборки могут быть очень большими.
- Риск: нагрузка на БД, рост времени ответа, OOM при экспорте.
- Рекомендация: добавить лимит/пагинацию и потоковый экспорт.

10) **Возможные несоответствия модулей доступа**
- Где: `backend/src/middleware/checkModuleAccess.js`, `backend/src/controllers/adminPermissionsController.js`, `admin-frontend/src/stores/auth.js`.
- Суть: списки модулей по умолчанию для manager отличаются от интерфейса (в UI есть `reports`, в backend — нет).
- Риск: расхождение поведения, непредсказуемые блокировки.
- Рекомендация: централизовать список модулей в БД и использовать его везде.

11) **Отсутствие строгих security-заголовков**
- Где: `backend/src/app.js`.
- Суть: нет Helmet/CSP/HSTS/X-Frame-Options.
- Риск: XSS/Clickjacking/ MIME-sniffing.
- Рекомендация: подключить `helmet`, настроить CSP.

12) **Неполная реализация cloud storage fallback**
- Где: `backend/src/routes/cloudStorageRoutes.js`, `frontend/src/services/telegram.js`.
- Суть: frontend использует DELETE fallback, но backend не содержит DELETE маршрута.
- Риск: ошибки при очистке облачного хранилища, накопление мусора.
- Рекомендация: добавить DELETE либо убрать вызов.

13) **Логирование и аудит действий фактически не сохраняются**
- Где: `backend/src/services/auditService.js`.
- Суть: `logAuditEvent` возвращает entry без сохранения/отправки.
- Риск: несоответствие требованиям аудита и отсутствие трассируемости.
- Рекомендация: реализовать сохранение/отправку (например, в БД + Telegram thread).

### Низкая

14) **Использование SELECT \***
- Где: `backend/src/models/theoryModel.js`, `backend/src/controllers/adminPositionController.js`, `backend/src/controllers/adminAssessmentController.js`, `backend/src/controllers/branchController.js`, `backend/src/controllers/adminBranchController.js`.
- Риск: лишняя нагрузка и неявные изменения при расширении схемы.
- Рекомендация: перечислять нужные поля.

15) **Подробные console.log в production-коде**
- Где: `backend/src/controllers/authController.js`, `admin-frontend/src/services/websocket.js`.
- Риск: утечка метаданных в логи, шум.
- Рекомендация: заменить на структурированный логгер и добавить уровни.

## Производительность

- **Отсутствие пагинации**: см. `backend/src/controllers/adminUserController.js`. При росте базы возможны долгие ответы и нагрузка на БД.
- **In-memory кеш**: `backend/src/services/cacheService.js` хранит данные в памяти с `setTimeout` на каждый ключ. При высоком трафике это будет расти и не делиться между инстансами.
- **Экспорт Excel**: `adminUserController.exportUsersToExcel` формирует файл целиком в памяти.
- **WebSocket**: по умолчанию разрешены `polling` и `websocket`, что увеличивает нагрузку; корректно, но стоит ограничить `allowedOrigins`.

Рекомендации:
- Внедрить пагинацию/limit, использовать cursor-based пагинацию для крупных выборок.
- Рассмотреть Redis для кеша и вынести кеширование на уровень API-gateway.
- Реализовать потоковый экспорт и очередь задач (например, BullMQ).

## Безопасность (детали по модулям)

### Backend
- **JWT секреты и refresh-cookie**: см. критично/высокое.
- **Отсутствие rate-limit**: см. высокий риск.
- **CORS**: см. критично.
- **Валидация**: частично через Joi, но есть маршруты без строгой схемы (например, `adminUserController.createUser`, `resetPassword`).
- **AuthZ**: `canEditUser` не проверяет филиал; это прямой риск доступа.
- **Логи аудита**: не реализованы фактически.
- **WebSocket**: использует JWT, но отсутствие строгого allowedOrigins при пустом `ALLOWED_ORIGINS` повышает риск.

### Admin-frontend
- **localStorage для токенов**: риск XSS.
- **Обработка refresh**: зависит от cookie без CSRF-защиты.
- **WebSocket**: токен в `auth` передается корректно, но при XSS возможна компрометация.

### Frontend (MiniApp)
- **initData**: отправляется в header, корректно. Рекомендуется ограничить время жизни на сервере.
- **Cloud storage fallback**: несоответствие HTTP-методов (см. средний риск).

### Bot
- **Переменные окружения**: корректно, но стоит исключить `.env` из репозитория.

## База данных

Плюсы:
- используются индексы и внешние ключи (`backend/database/migrations/001_init.sql`), корректная кодировка `utf8mb4_unicode_ci`.

Риски/замечания:
- `refresh_token` хранится в открытом виде. Рекомендуется хранить хэш и добавлять индекс.
- есть `SELECT *` и некоторые запросы без явного набора полей.
- при росте данных полезно добавить индексы на `users(first_name,last_name)` или полнотекстовые индексы для поиска.

## CI/CD и секреты

- В `deploy-backend.yml` секреты подставляются корректно через GitHub Secrets.
- В репозитории присутствуют `.env` файлы (`backend/.env`, `bot/.env`, `frontend/.env`, `admin-frontend/.env`). Если они коммитятся, это утечка секретов.

## Зависимости и уязвимости

Проверка выполнена через `npm audit --json`:

- backend: уязвимостей не найдено (prod 274, dev 24)
- bot: уязвимостей не найдено (prod 19, dev 28)
- admin-frontend: уязвимостей не найдено (prod 74, dev 68)
- frontend: **2 умеренные уязвимости**
  - `vite` и транзитивно `esbuild` (CVE: GHSA-67mh-4wv8-2f99). Риск актуален для dev-сервера.
  - Рекомендация: обновить `vite` до >= 7.3.0, или ограничить доступ к dev-серверу (не expose наружу).

## Рекомендации (приоритет)

### P0 (немедленно)
1) Убрать фолбэк-секреты JWT, падать при их отсутствии.
2) Зафиксировать `ALLOWED_ORIGINS` и запретить `origin: true` в production.
3) Добавить CSRF-защиту для refresh-cookie.
4) Исправить `canEditUser` — проверка филиала.

### P1
5) Перенести access-token из localStorage в память, ужесточить CSP.
6) Добавить rate-limit на `/admin/auth/login`.
7) Ввести лимиты/пагинацию для больших списков и экспорта.
8) Добавить DELETE для `/cloud-storage/:key`.

### P2
9) Централизовать перечень модулей доступа.
10) Реализовать аудит логов (сохранение + отправка в Telegram).
11) Улучшить кеширование (user-scope, Redis).
12) Заменить `SELECT *` на явные поля.

## Приложение: ключевые файлы

- `backend/src/app.js` — CORS, middleware, маршрутизация.
- `backend/src/controllers/adminAuthController.js` — JWT, refresh, cookies.
- `backend/src/middleware/verifyJWT.js` — проверка токенов.
- `backend/src/middleware/canEditUser.js` — права редактирования.
- `backend/src/services/telegramAuthService.js` — проверка initData.
- `backend/src/services/auditService.js` — аудит логов.
- `admin-frontend/src/utils/axios.js` — хранение токена, refresh.
- `admin-frontend/src/stores/auth.js` — auth state.
- `frontend/src/services/telegram.js` — cloud storage fallback.
- `.github/workflows/deploy-backend.yml` — CI/CD.
- `backend/database/migrations/001_init.sql` — схема БД.
