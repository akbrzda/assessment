# Design System для assessment

## Статус документа

Этот документ заменяет предыдущую версию дизайн-системы для `assessment` и фиксирует новое правило:

- `frontend` (Telegram Mini App) **сохраняет светлую и тёмную тему**;
- `admin-frontend` **переводится на компонентный слой в стиле shadcn/ui для Vue**;
- единый икон-сет для обоих интерфейсов — **Lucide**;
- визуальная база опирается на качество и аккуратность `foodminiapp`, но не копирует его 1:1.

---

## 1. Базовая стратегия

### 1.1 Разделение по платформам

В проекте две разные UX-среды. Им нельзя навязывать одинаковую визуальную архитектуру.

#### Telegram Mini App

Цель:

- быстрый интерфейс;
- высокий контраст;
- хорошая читаемость на мобильном экране;
- корректная работа в контексте Telegram WebApp;
- полноценная поддержка light/dark theme.

Подход:

- токены на уровне CSS custom properties;
- компонентная оболочка поверх токенов;
- темы переключаются через `data-theme="light" | "dark"`;
- стили не завязываются на shadcn-слой.

#### Admin Panel

Цель:

- привести интерфейс к предсказуемой компонентной системе;
- убрать разрозненные кастомные стили;
- стандартизировать таблицы, формы, модальные окна, фильтры, навигацию, badge, charts wrappers;
- сократить стоимость поддержки UI.

Подход:

- использовать **shadcn/ui-подход для Vue**;
- базовый стек: Tailwind CSS + open-code компоненты + `class-variance-authority` + `clsx` + `tailwind-merge` + `lucide-vue-next`;
- не использовать самописные ad hoc-компоненты там, где есть базовый системный компонент.

---

## 2. Технологическое решение

### 2.1 Mini App

Mini App остаётся на текущей модели:

- CSS variables;
- глобальные utility-классы только для app-shell и общих mobile-паттернов;
- `light` и `dark` — обязательны;
- Telegram-specific safe areas и runtime state остаются частью foundation layer.

### 2.2 Admin Panel

Так как `assessment/admin-frontend` — это Vue-приложение, перенос должен идти не на React-реализацию `shadcn/ui`, а на **эквивалентный shadcn-подход для Vue**.

Решение:

- `shadcn-vue` как источник компонентного паттерна;
- `lucide-vue-next` как единый пакет иконок;
- Tailwind CSS как utility/foundation слой;
- токены темы через CSS variables;
- при необходимости допускается совместимость с `reka-ui`-совместимыми примитивами, но только под системные компоненты.

### 2.3 Что запрещено

Запрещается:

- смешивать старые произвольные `.btn-*`, `.card-*`, `.modal-*` классы с новым компонентным слоем в новых экранах;
- создавать отдельный набор иконок помимо Lucide;
- дублировать один и тот же компонент в `components/`, `shared/`, `ui/` и `views/partials`;
- переносить shadcn-паттерн в Mini App как основной UI-фреймворк.

---

## 3. Принципы системы

### 3.1 Open code

Компоненты должны быть доступны для изменения. UI — часть продукта, а не внешняя чёрная коробка.

### 3.2 Token first

Сначала задаются токены:

- color
- spacing
- radius
- typography
- shadow
- motion
- z-index

Только после этого строятся компоненты.

### 3.3 Component first для Admin

Новый экран в админке собирается из системных компонентов:

- Button
- Input
- Select
- Checkbox
- Switch
- Dialog
- Sheet
- DropdownMenu
- Tooltip
- Tabs
- Table
- Badge
- Card
- Separator
- Skeleton
- Alert
- Form wrappers

### 3.4 Mobile first для Mini App

Mini App проектируется сначала под мобильное использование.

### 3.5 Theme parity для Mini App

Любой новый компонент Mini App обязан иметь корректный light и dark вид.

### 3.6 Accessibility baseline

Обязательны:

- `:focus-visible` состояния;
- контраст текста и интерактивных элементов;
- иконка не заменяет текст там, где нужен явный смысл;
- loading/error/disabled состояния.

---

## 4. Архитектура токенов

### 4.1 Foundation tokens

Фундаментальные токены общие по структуре для двух приложений, но значения разные.

Группы токенов:

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--border`
- `--input`
- `--ring`
- `--success`
- `--warning`
- `--info`
- `--radius`

### 4.2 Semantic tokens

#### Mini App

- `--tg-app-bg`
- `--tg-surface`
- `--tg-surface-elevated`
- `--tg-text-primary`
- `--tg-text-secondary`
- `--tg-brand`
- `--tg-brand-pressed`
- `--tg-success`
- `--tg-warning`
- `--tg-danger`
- `--tg-divider`
- `--tg-safe-top`
- `--tg-safe-bottom`

#### Admin Panel

- `--admin-sidebar-bg`
- `--admin-sidebar-foreground`
- `--admin-sidebar-active`
- `--admin-header-bg`
- `--admin-table-row-hover`
- `--admin-chart-1`
- `--admin-chart-2`
- `--admin-chart-3`
- `--admin-chart-4`
- `--admin-chart-5`

### 4.3 Alias tokens

Разрешены только как временный слой миграции.

Примеры:

- `--accent-blue -> --primary`
- `--bg-primary -> --background`
- `--text-primary -> --foreground`
- `--divider -> --border`

Новые компоненты не должны использовать legacy alias напрямую.

---

## 5. Цветовая модель

### 5.1 Общая идея

`assessment` остаётся с синим брендовым акцентом.

Почему:

- текущая Mini App уже завязана на синий акцент;
- текущая Admin Panel уже использует `accent-blue`;
- это уменьшает визуальный разрыв при миграции.

Жёлтый приём из `foodminiapp` не переносится как основной primary. Он может использоваться как:

- highlight;
- achievement accent;
- badge для лидерборда;
- attention surface.

### 5.2 Цветовые роли

#### Primary

Главный акцент интерфейса. Для CTA, активных состояний, ссылок, selected states.

#### Secondary

Нейтральные вторичные поверхности.

#### Muted

Тихие поверхности и вторичный текст.

#### Accent

Лёгкий визуальный акцент. Не дублирует primary CTA.

#### Destructive

Удаление, блокировка, критические ошибки.

#### Success

Пройдено, подтверждено, успешно.

#### Warning

Нужно внимание, дедлайн, неполное состояние.

---

## 6. Typography

### 6.1 Mini App

Mini App остаётся максимально нейтральным и быстрым:

- system font stack;
- компактные mobile размеры;
- крупные action areas;
- высокий line-height для списков и карточек.

Роли:

- `display-sm`
- `title-lg`
- `title-md`
- `title-sm`
- `body-lg`
- `body-md`
- `body-sm`
- `caption`

### 6.2 Admin Panel

Admin получает более строгую типографическую шкалу:

- системный sans stack или Inter;
- меньшая декоративность;
- более строгий визуальный rhythm для форм, таблиц и dashboards.

Роли:

- `heading-1`
- `heading-2`
- `heading-3`
- `section-title`
- `body`
- `body-small`
- `label`
- `helper`
- `table-cell`

---

## 7. Иконки

### 7.1 Единый стандарт

Для обоих приложений используется только **Lucide**.

### 7.2 Правила

- иконки импортируются адресно, а не целым набором;
- размер по умолчанию:
  - Mini App: `18` или `20`;
  - Admin: `16`, `18`, `20`;
- stroke width единообразный внутри одного интерфейса;
- иконка не должна быть единственным носителем смысла в destructive/critical actions.

### 7.3 Запрещено

- смешивать Lucide с Heroicons, Font Awesome, Material Icons;
- красить иконки инлайном без токенов;
- использовать разные stroke-width для одинаковых ролей.

---

## 8. Компонентная модель для Admin Panel

### 8.1 Базовый каталог

В `admin-frontend/src/components/ui/` должны жить системные компоненты.

Минимальный стартовый набор:

- `button`
- `input`
- `textarea`
- `select`
- `checkbox`
- `switch`
- `label`
- `badge`
- `card`
- `separator`
- `dialog`
- `sheet`
- `dropdown-menu`
- `tabs`
- `table`
- `scroll-area`
- `skeleton`
- `tooltip`
- `alert`
- `toast`

### 8.2 Слои компонентов

#### ui

Примитивы и базовые системные компоненты.

#### shared/components

Переиспользуемые продуктовые компоненты.
Примеры:

- `PageHeader`
- `DataTableToolbar`
- `StatusBadge`
- `MetricCard`
- `ConfirmDialog`

#### feature components

Компоненты внутри конкретной фичи.

### 8.3 Правило сборки экрана

Новый экран должен собираться так:

- layout shell;
- page header;
- filters bar;
- content card/table/chart blocks;
- dialogs/sheets;
- toasts;
- loading/error/empty states.

Нельзя строить экран прямо из случайных `div + class` без системных компонентов.

---

## 9. Компонентная модель для Mini App

Mini App использует отдельный набор mobile-first компонентов.

Минимальный каталог:

- `AppButton`
- `AppIconButton`
- `AppCard`
- `AppInput`
- `AppTextarea`
- `AppSearchField`
- `AppBadge`
- `AppProgress`
- `AppSheet`
- `AppDialog`
- `AppListItem`
- `AppSkeleton`
- `AppEmptyState`
- `AppErrorState`
- `AppSection`

Каждый компонент обязан поддерживать:

- light theme;
- dark theme;
- disabled state;
- loading state, если применимо.

---

## 10. Layout правила

### 10.1 Mini App

- одна колонка;
- safe areas обязательны;
- fixed footer/button bar допускаются;
- большие CTA;
- минимальная визуальная перегрузка.

### 10.2 Admin Panel

- sidebar + header + content shell;
- все отступы и размеры идут через scale;
- таблицы, формы и аналитические карточки используют единые контейнеры;
- page width, section gaps и card padding стандартизированы.

---

## 11. Состояния

Для каждого системного компонента обязательны состояния:

- default;
- hover;
- active;
- focus-visible;
- disabled;
- loading;
- error;
- success, если применимо.

Для каждой страницы обязательны состояния:

- loading;
- empty;
- error;
- partial content;
- success feedback.

---

## 12. Правила внедрения

### 12.1 Mini App

Оставить:

- светлую и тёмную тему;
- текущую Telegram-safe-area модель;
- mobile-first tokens.

Улучшить:

- выровнять naming токенов;
- убрать дубли utility-классов;
- перевести повторяющиеся шаблоны в системные компоненты.

### 12.2 Admin Panel

Перевести на:

- `components/ui/*`;
- shadcn-style component API;
- Lucide icons;
- Tailwind + token-driven theming;
- единые form/table/dialog patterns.

Убрать постепенно:

- разрозненные глобальные `.btn-*`, `.card-*`, `.modal-*`;
- случайные inline-style решения;
- стихийные вариации таблиц и форм.

---

## 13. Definition of Done для UI-задачи

Задача считается завершённой, если:

### Mini App

- компонент работает в light и dark;
- не ломает safe-area и mobile layout;
- использует системные токены;
- имеет loading/disabled/error states;
- не вводит новый ad hoc стиль без причины.

### Admin Panel

- экран собран из системных компонентов;
- иконки только Lucide;
- нет legacy-классов там, где уже есть UI-компонент;
- тема и токены подключены правильно;
- таблицы, формы и dialogs соответствуют системным паттернам.

---

## 14. Приоритет внедрения

### Сначала

1. Зафиксировать токены.
2. Поднять UI-kit для Admin.
3. Выровнять Button/Input/Card/Badge/Dialog/Table.
4. Привести иконки к Lucide.

### Потом

5. Перевести основные admin-экраны.
6. Упростить Mini App components layer.
7. Очистить legacy CSS.

### Не делать сейчас

- полный редизайн Mini App под desktop-паттерны;
- смешивание Mini App и Admin в одну универсальную библиотеку компонентов;
- массовый cosmetic rewrite без токенов и системных компонентов.

---

## 15. Итоговое правило

Финальная модель для `assessment` такая:

- **Mini App = отдельный mobile-first интерфейс со светлой и тёмной темой**;
- **Admin Panel = shadcn-style component system для Vue + Lucide + Tailwind + token-driven theming**;
- **оба интерфейса объединяются на уровне принципов, токенов и иконографии, но не обязаны иметь одинаковый UI-слой**.
