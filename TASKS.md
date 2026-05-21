# Задачи проекта

Обновлено: 2026-05-21

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