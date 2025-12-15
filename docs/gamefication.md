# Система геймификации и выдачи бейджей

## 1. Ключевые сущности БД

| Таблица                             | Назначение                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `gamification_levels`               | Описание уровней: `level_number`, код, название, минимальные очки для перехода.                   |
| `badges`                            | Каталог бейджей с кодом, названием, описанием, иконкой, условием получения и статусом активности. |
| `user_gamification_stats`           | Текущий и максимальный стрик, отметки времени последнего успеха/попытки (`user_id` — PK).         |
| `gamification_events`               | История начислений очков: тип события, количество очков, описание, привязка к филиалу/должности.  |
| `user_badges`                       | Полученные бейджи (уникальная пара `user_id`/`badge_id`), время выдачи и комментарий.             |
| `users` (колонки `points`, `level`) | Текущий счёт и уровень сотрудника.                                                                |

Все таблицы создаются в миграции `backend/database/migrations/005_create_gamification_tables.sql`. Изменение параметров уровней/бейджей осуществляется через REST‑контроллеры (`levelsController.js`, `badgesController.js`) и фиксируется в истории (`backend/database/migrations/017_enhance_gamification_management.sql` добавляет поля и аудит).

## 2. Поток начисления очков

Обработка попытки завершения теста реализована в `processAttemptCompletion` (`backend/src/services/gamificationService.js`). Алгоритм:

1. **Валидация**: менеджеры/админы пропускаются (`user.roleName !== 'employee'`).
2. **Расчёт базовых данных**:
   - определяем, успешно ли завершена попытка (`scorePercent >= passScorePercent`);
   - подготавливаем текущие статистики пользователя (уровень, стрик).
3. **Начисление очков** (`events` массив):
   - **Base** — целая часть процента: `Math.max(0, round(scorePercent))`.
   - **Perfect bonus** — +40 очков и бейдж `perfect_run`, если все ответы верны.
   - **Competence bonus** — +20 очков и маркировка, если результат ≥ 90%.
   - **Speed bonus** (при наличии таймера):
     - ≤50% времени — +25 очков и бейдж `speedster`.
     - ≤70% времени — +15 очков.
     - ≤85% времени — +10 очков.
   - **Streak bonus** — базируется на `STREAK_MILESTONES`: 3/5/10 успешных попыток подряд дают +25/+40/+75 очков; при значениях ≥5 выдаётся бейдж `streak_master`.
4. **Стрики**:
   - успешная попытка увеличивает `currentStreak`, обновляет `longestStreak` и `lastStreakAward`.
   - провал — сбрасывает `currentStreak`.
   - статистика хранится в `user_gamification_stats`.
5. **Сохранение**:
   - события записываются в `gamification_events` (`recordEvent`), чтобы можно было анализировать историю начислений по пользователям/филиалам.
   - очки и уровень пользователя обновляются в `users`.
6. **Получение бейджей**:
   - кандидаты собираются в `badgesToAward`.
   - для каждого запрашивается запись в `badges` (`getBadgeByCode`) и фиксируется в `user_badges`.
7. **Итоговый ответ** возвращает:
   - сумму очков, детализацию событий;
   - новую/старую величину очков, уровень, информацию о следующем уровне (`findLevelForPoints`, `findNextLevel`);
   - текущий стрик и список новых бейджей;
   - сумму очков за месяц (`listUserMonthlyPoints`).
8. **Логирование**: собирается текст из ключевых фактов (`logContext`), который отправляется в Telegram (`sendTelegramLog`). Это позволяет суперадминам мониторить успехи сотрудников.

> **Примечание:** начальная сумма очков, правила бонусов и список бейджей захардкожены в сервисе и катологе `badges`. Изменить их можно через админ‑контроллеры и панель настроек, но по умолчанию правила едины для всех подсистем.

## 3. Каталог уровней и бейджей

- **Уровни**: миграция создаёт шесть уровней (Новичок → Гуру) с порогами 0/500/1200/2000/3200/4800 очков. Контроллер `levelsController` позволяет:
  - получать список уровней;
  - обновлять параметры (`PUT /admin/levels/:level_number`);
  - пересчитывать уровни пользователей (`POST /admin/levels/recalculate`), что полезно после изменения порогов.
- **Бейджи**: начальный каталог (`badges`):
  - `perfect_run`, `speedster`, `competence_90`, `all_tests_completed`, `monthly_top3`, `position_champion`, `streak_master`.
  - Миграция 017 добавляет поле `condition_type` и `condition_data`, позволяя системе понимать автоматические правила.
  - Контроллер `badgesController` поддерживает CRUD и выдаёт историю изменений.

## 4. Использование в MiniApp и админке

- **Мини‑приложение**:
  - `apiClient.getGamificationOverview()` → `gamificationController.getOverview` возвращает полный срез (очков, уровней, стриков, бейджей, monthlyPoints) и отображается на вкладке «Профиль» (`frontend/src/views/ProfileView.vue`).
  - `getGamificationBadges()` используется для отдельного списка медалей.
- **Админ‑панель**:
  - Отдельных экранов геймификации пока нет, но REST‑контроллеры (`levelsController`, `badgesController`) подключены к `/admin` маршрутам и могут быть использованы для управления через UI.

## 5. Таблицы и зависимости

```
users ─┬─< gamification_events >─┬─ branches
       │                         └─ positions
       ├─ user_gamification_stats
       └─ user_badges >─ badges
```

- `gamification_events.branch_id/position_id` устанавливаются по контексту пользователя на момент начисления, что позволяет фильтровать статистику по филиалу/должности.
- `user_gamification_stats` гарантирует существование строки через `ensureUserStats`.

## 6. Точки расширения и ограничения

- **Параметры бонусов** — прописаны в коде (`BADGES`, `STREAK_MILESTONES`, `COMPETENCE_THRESHOLD`, коэффициенты по скорости). Чтобы внедрить настройки из интерфейса, потребуется вынести их в `system_settings` и переиспользовать в сервисе.
- **События** — текущий набор типов (`base`, `perfect_bonus`, `competence_bonus`, `speed_bonus`, `streak_bonus`) фиксирован. Для новых сценариев можно расширить `buildEvent` и фронт‑отображение.
- **Бейджи** — расширяемый каталог, но автоматическое присваивание реализовано только в `processAttemptCompletion`. Для других условий нужно расширять логику (например, топ‑3 месяца, лучший по должности).
- **Отчётность** — на основе `gamification_events` можно строить агрегаты (уже используется `listUserMonthlyPoints`). При необходимости можно добавить SQL‑представления или репорты в админке.

## 7. Гибкая система правил (Stage 2)

### 7.1. Архитектура

Начиная с миграции `018_gamification_rules.sql`, система поддерживает гибкие, настраиваемые правила геймификации:

**Таблицы:**

- `gamification_rules` — каталог правил с приоритетом, условиями, формулами, scope и периодом действия
- `gamification_rule_history` — история изменений правил для аудита
- `system_settings.GAMIFICATION_RULES_ENABLED` — флаг включения движка правил

**Backend компоненты:**

- `backend/src/models/gamificationRulesModel.js` — CRUD операции над правилами
- `backend/src/services/gamificationRulesEngine.js` — движок оценки правил с кэшированием
- `backend/src/controllers/adminGamificationRulesController.js` — REST API для управления
- `backend/src/controllers/gamificationRulesController.js` — dry-run симуляция
- `backend/src/routes/adminGamificationRulesRoutes.js` — маршруты `/api/admin/gamification/rules`

### 7.2. Структура правила

Каждое правило содержит:

```json
{
  "id": 1,
  "code": "base_score",
  "name": "Базовые очки за % результата",
  "ruleType": "points|badge",
  "condition": {
    "passed": true|false|null,
    "perfect": true|false|null,
    "min_score": 0-100,
    "max_score": 0-100,
    "max_time_ratio": 0-1,
    "min_streak": 0+
  },
  "formula": {
    "mode": "fixed|percent_of_score|multiplier",
    "value": число,
    "cap": число (для percent_of_score),
    "badge_code": "код" (для ruleType=badge)
  },
  "scope": {
    "branchIds": [1, 2],
    "positionIds": [1],
    "assessmentIds": [10, 15]
  },
  "priority": 100,
  "isActive": true,
  "activeFrom": "2025-01-01T00:00:00",
  "activeTo": "2025-12-31T23:59:59"
}
```

**Условия (`condition`):**

- `passed` — требуется успешное прохождение
- `perfect` — все ответы верны
- `min_score/max_score` — диапазон процента результата
- `max_time_ratio` — макс. доля затраченного времени (0.5 = 50% от лимита)
- `min_streak` — минимальная серия успешных попыток

**Формулы (`formula`):**

- `fixed` — фиксированное число очков
- `percent_of_score` — очки = `scorePercent * value`, с опциональным `cap`
- `multiplier` — очки = `basePoints * value`
- Для бейджей: указывается `badge_code`

**Scope:**
Ограничивает применение правила по филиалам, должностям или аттестациям. Если не указан — применяется всегда.

### 7.3. Движок правил

`gamificationRulesEngine.evaluate()` работает так:

1. Проверяет флаг `GAMIFICATION_RULES_ENABLED` (по умолчанию `false`)
2. Загружает активные правила из кэша (TTL 30 сек)
3. Фильтрует по scope и условиям
4. Для подходящих правил вычисляет очки/бейджи по формулам
5. Возвращает `{ usedRules: true, events: [...], badges: [...] }`

Если флаг выключен, возвращает `{ usedRules: false }` и сервис `gamificationService` использует встроенную логику (legacy).

### 7.4. REST API

**Эндпоинты** (требуют JWT + роль `superadmin`):

- `GET /api/admin/gamification/rules` — список всех правил
- `GET /api/admin/gamification/rules/:id` — получить правило
- `POST /api/admin/gamification/rules` — создать правило
- `PUT /api/admin/gamification/rules/:id` — обновить правило
- `DELETE /api/admin/gamification/rules/:id` — удалить правило
- `POST /api/admin/gamification/rules/dry-run` — симуляция без записи в БД

**Dry-run запрос:**

```json
{
  "userId": 1,
  "assessmentId": 10,
  "branchId": 2,
  "positionId": 3,
  "scorePercent": 92,
  "passed": true,
  "perfect": false,
  "timeSpentSeconds": 120,
  "timeLimitMinutes": 5,
  "currentStreak": 3
}
```

**Dry-run ответ:**

```json
{
  "usedRules": true,
  "totalPoints": 135,
  "events": [
    { "type": "base_score", "points": 92, "description": "Базовые очки" },
    { "type": "competence_bonus", "points": 20, "description": "Бонус за 90%+" },
    { "type": "streak_bonus", "points": 25, "description": "Серия ≥3" }
  ],
  "badges": ["competence_90"]
}
```

### 7.5. Админ-панель

**Компоненты:**

- `admin-frontend/src/api/gamificationRules.js` — API клиент
- `admin-frontend/src/components/GamificationRulesManager.vue` — таблица правил с фильтрами, CRUD
- `admin-frontend/src/components/GamificationRuleForm.vue` — модальная форма создания/редактирования
- `admin-frontend/src/components/GamificationDryRun.vue` — тестирование правил
- Интеграция в `admin-frontend/src/views/SettingsView.vue` → секция "Гибкие правила геймификации"

**Возможности UI:**

- Включение/выключение движка правил через чекбокс `GAMIFICATION_RULES_ENABLED`
- Список правил с фильтрацией по типу, статусу, поиску
- Создание/редактирование правил через визуальную форму (без ручного JSON)
- Dry-run тестирование с вводом параметров попытки и отображением результата
- История изменений сохраняется в `gamification_rule_history`

### 7.6. Начальные правила

Миграция `018` создаёт 13 seed-правил (неактивных по умолчанию), эквивалентных текущей логике:

- `base_score` — процент результата как очки
- `perfect_bonus` / `perfect_badge` — +40 и бейдж за идеальный результат
- `competence_bonus` / `competence_badge` — +20 и бейдж за 90%+
- `speed_bonus_50` / `speed_badge` — +25 и бейдж за ≤50% времени
- `speed_bonus_70`, `speed_bonus_85` — +15/+10 за ≤70%/≤85%
- `streak_bonus_3`, `streak_bonus_5`, `streak_bonus_10` — бонусы за серии
- `streak_badge` — бейдж за серию ≥5

Администратор может активировать их, изменить значения или создать собственные правила.

### 7.7. Миграция с legacy на правила

**Этап 1:** Включить флаг `GAMIFICATION_RULES_ENABLED = true` в админке
**Этап 2:** Активировать seed-правила или создать кастомные
**Этап 3:** Протестировать через dry-run
**Этап 4:** Мониторить события начисления очков

При выключении флага система автоматически возвращается к встроенной логике без потери данных.

## 8. Итог

Геймификация построена вокруг завершения аттестаций: каждая успешная попытка фиксируется, начисляет очки, обновляет стрики и выдает бейджи. Состояние хранится в нескольких таблицах, предоставляется в MiniApp и контролируется через REST‑эндпоинты админ‑панели. Правила универсальны для всех филиалов и должностей; изменение порогов/бейджей возможно через системные настройки, но для внесения новых сценариев потребуются правки сервиса.
