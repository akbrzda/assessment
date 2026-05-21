# Задачи проекта

Обновлено: 2026-05-21

---

## Адаптивность admin-frontend — исправления по аудиту

- [x] Critical: мобильный поиск в TopBar (кнопка-триггер + overlay)
- [x] High: modal-actions — вертикальная укладка кнопок на < 480px (style.css)
- [x] High: Pagination — touch-таргеты h-10 на mobile
- [x] Medium: offline-banner цвет → CSS-переменная
- [x] Medium: Dashboard stat cards — mobile-first grid (1→2→4 колонки)
- [x] Medium: Modal.vue — padding px-4/py-3 на mobile
- [x] Medium: activity-time font-size 11px → 12px
- [x] Medium: FilterBar inline selects h-10 на mobile
- [x] Low: dashboard-row gap 32px → 20px/16px на mobile
- [x] Low: bulk-actions-bar safe-area-inset

---

## Спринт 5 — Улучшения и технический долг (MEDIUM/LOW)

### TASK-017 · QA-чеклист по «Курсам» ❓

- [ ] Прогнать regression pack по всем сценариям из `docs/courses/design.md`
- [ ] Зафиксировать результат и нераскрытые edge-cases

### TASK-024 · Accessibility WCAG ❓

- [ ] Провести автоматизированный audit (axe / Lighthouse) по MiniApp
- [ ] Исправить критические нарушения: contrast, progressbar aria, focus-visible, touch-target

### TASK-029 · UI-документация компонентов ❌

- [ ] Расширить `docs/frontend.md` или создать `docs/engineering/ui-components.md`
- [ ] Покрыть ключевые переиспользуемые компоненты admin-frontend

### TASK-030 · Архивный backlog ❌

- [ ] Просмотреть `docs/archive/features-backlog.md`
- [ ] Активные/незакрытые пункты добавить в этот файл или PROJECT_TASKS_BACKLOG.md
- [ ] Оставить в архиве только исторический snapshot

### TASK-031 · Захардкоженный бренд в подтеме ❓

- [ ] Найти компоненты подтемы с захардкоженным названием бренда
- [ ] Вынести в конфигурацию или настройки компании/тенанта

### TASK-032 · Оптимизация аналитических запросов ❓

- [ ] Запустить EXPLAIN на тяжёлых запросах в `courseAnalytics.repository.js` и `analyticsModel.js`
- [ ] Добавить недостающие индексы
- [ ] При необходимости ввести кэширование результатов (Redis)
