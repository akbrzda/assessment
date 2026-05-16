# Документация проекта Assessment

Система аттестации сотрудников: Telegram MiniApp + Admin Panel + Backend (Node.js/MySQL) + Telegram-бот.

---

## Навигация

### Продуктовые требования

| Файл                                                               | Содержание                                                                | Аудитория                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------- |
| [product/courses-requirements.md](product/courses-requirements.md) | Бизнес-требования к модулю «Курсы»: терминология, структура, сценарии     | Product, аналитики        |
| [product/bot-features.md](product/bot-features.md)                 | Спецификация доработки Telegram-бота: онбординг, уведомления, сертификаты | Product, разработчики, QA |
| [product/max-telegram-unified-integration.md](product/max-telegram-unified-integration.md) | Инструкция по унификации MAX и Telegram: приглашения, подтверждение аккаунта, идентификация по номеру | Product, Backend, Frontend, QA |
| [product/max-telegram-unified-roadmap.md](product/max-telegram-unified-roadmap.md) | Roadmap по спринтам и задачам для внедрения интеграции MAX + Telegram | PM, Product, Tech Lead |

### Модуль «Курсы»

| Файл                                                 | Содержание                                                                     | Аудитория        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------- |
| [courses/design.md](courses/design.md)               | Полная техническая спецификация: роли, структура, логика состояний, edge-cases | Разработчики, QA |
| [courses/api-contracts.md](courses/api-contracts.md) | API-контракты (Sprint 1-2): endpoint-ы, форматы запросов/ответов, ошибки       | Разработчики     |
| [courses/screen-spec.md](courses/screen-spec.md)     | Спецификация экранов admin-panel и клиентского приложения                      | Frontend, QA     |

### Дизайн-система

| Файл                                                       | Содержание                                                       | Аудитория                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| [design/system.md](design/system.md)                       | Стратегия дизайн-системы: токены, Mini App, Admin Panel, правила | Frontend-разработчики, дизайнеры |
| [design/migration-roadmap.md](design/migration-roadmap.md) | План поэтапной миграции admin-panel на shadcn-style UI           | Frontend-разработчики            |

### Инженерные регламенты

| Файл                                                           | Содержание                                                               | Аудитория             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| [engineering/architecture.md](engineering/architecture.md)     | Архитектурный регламент: MVC + Layered, структура модулей, правила слоёв | Все разработчики      |
| [engineering/api-guidelines.md](engineering/api-guidelines.md) | REST API регламент: структура URL, HTTP-методы, версионирование, ответы  | Backend-разработчики  |
| [engineering/code-standards.md](engineering/code-standards.md) | Стандарты кода: принципы, ограничения размера, именование, async         | Все разработчики      |
| [engineering/components.md](engineering/components.md)         | Базовые правила и описание UI-компонентов                                | Frontend-разработчики |

### Архив

| Файл                                                       | Содержание                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| [archive/features-backlog.md](archive/features-backlog.md) | Сырые заметки по планируемым фичам (неструктурированный бэклог) |

---

## Структура проекта

```
assessment/
  backend/          Node.js/Express API + MySQL
  frontend/         Telegram MiniApp (Vue 3)
  admin-frontend/   Admin Panel (Vue 3)
  bot/              Telegram-бот (Telegraf)
  docs/             Документация (этот раздел)
```

---

## Ссылки

- Корневые файлы: [AGENTS.md](../AGENTS.md), [TASKS.md](../TASKS.md), [ROADMAP.md](../ROADMAP.md)
