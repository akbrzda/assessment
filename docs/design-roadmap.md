# Assessment Admin Panel Migration to shadcn-style UI

## Цель

Перевести `admin-frontend` на компонентный UI-слой в стиле shadcn для Vue.

Итоговое состояние:

- общий `ui/` слой;
- единые токены;
- `lucide-vue-next` как единственный icon set;
- страницы собираются из базовых компонентов, а не из ad hoc разметки;
- таблицы, формы и диалоги выглядят единообразно.

## Целевой стек

- Vue 3
- Tailwind CSS
- shadcn-vue style components
- Reka UI primitives
- lucide-vue-next
- локальные `src/components/ui/*`

## Не делать

Не переводить admin panel на React.

Не пытаться мигрировать весь UI за один коммит.

Не переписывать сразу весь экран, если можно сначала вынести базовый компонент.

## Порядок миграции

## Этап 0. Foundation

Сделать:

- подключить tokenized global styles;
- определить `cn()` helper;
- завести `src/components/ui/`;
- стандартизировать class naming;
- выровнять отступы, радиусы, тени, hover/focus states.

Результат:

- единая база для всех новых компонентов.

## Этап 1. Primitive components

Сначала перенести:

- Button
- Input
- Textarea
- Label
- Select
- Checkbox
- Switch
- RadioGroup
- Badge
- Card
- Separator
- Skeleton
- Tooltip

Результат:

- формы и простые карточки уже можно собирать без кастомных стилей на уровне страниц.

## Этап 2. Overlay components

Перенести:

- Dialog
- Sheet
- DropdownMenu
- Popover
- Toast
- AlertDialog

Результат:

- все overlay state и action flows становятся единообразными.

## Этап 3. Data display

Перенести:

- Table
- DataToolbar
- FiltersBar
- Pagination
- EmptyState
- StatCard
- ChartCard

Результат:

- аналитика, списки, каталоги и таблицы перестают быть визуально разрозненными.

## Этап 4. Layout

Перевести:

- sidebar
- page header
- section header
- content container
- filter panels
- action bars

Результат:

- вся панель выглядит как один продукт, а не как набор экранов.

## Этап 5. Screen-by-screen migration

Приоритет экранов:

1. login / auth pages
2. dashboard / analytics
3. tables and CRUD pages
4. settings
5. secondary screens

## Правило миграции одного экрана

Для каждого экрана:

1. убрать локальные ad hoc button/input/dialog стили;
2. заменить иконки на `lucide-vue-next`;
3. собрать экран из `ui/` компонентов;
4. убрать дублирующиеся utility-классы;
5. вынести shared page patterns.

## Definition of Done

Экран считается мигрированным, если:

- использует design tokens;
- использует только `ui/` компоненты для базового UI;
- не содержит локальных одноразовых button/input/modal вариантов;
- не использует вторую икон-библиотеку;
- поддерживает loading/empty/error/disabled states;
- визуально согласован с dashboard и forms.
