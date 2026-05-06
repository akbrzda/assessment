# Frontend: Admin Components

## PermissionMatrixComponent API

Компонент: `admin-frontend/src/components/PermissionMatrixComponent.vue`

### Назначение

Компонент отображает таблицу прав и позволяет задать для каждого права режим (`allow` / `deny` / `none`), условия (`conditions`) и срок действия (`expiresAt`).

### Props

- `permissions` (`Array`, optional, default: `[]`)
  - Список прав.
  - Поддерживаемые поля элемента: `permissionId` или `id`, `moduleCode` или `module_code`, `entityCode` или `entity_code`, `actionCode` или `action_code`.
- `modelValue` (`Array`, optional, default: `[]`)
  - Текущие выбранные значения.
  - Формат элемента:
    - `permissionId` (`Number`)
    - `effect` (`"allow" | "deny" | null`)
    - `conditions` (`Object | null`)
    - `expiresAt` (`ISO string | null`)
- `title` (`String`, optional, default: `"Матрица прав"`)
- `subtitle` (`String`, optional, default: `""`)

### Emits

- `update:modelValue`
  - Отправляется при изменении режима, условий или даты истечения.
  - Payload: обновлённый массив `modelValue`.
  - В payload остаются только записи с `effect = allow|deny`; элементы с `effect = null` исключаются.

### Поведение

- Для каждого права доступны радиокнопки `allow`, `deny`, `none`.
- Поле `conditions` редактируется как JSON в `textarea`.
- Если JSON в `conditions` невалиден, изменение игнорируется (событие не отправляется).
- Поле `expiresAt` задаётся через `datetime-local` и сохраняется как ISO-строка.
- Компонент не выполняет сетевых запросов и не сохраняет данные самостоятельно.

### Пример подключения

```vue
<PermissionMatrixComponent
  :title="'Матрица прав роли'"
  :subtitle="'Укажите режим и условия действия прав'"
  :permissions="permissions"
  v-model="permissionOverrides"
/>
```

### Ответственность родительского компонента

- Загрузить права из API.
- Преобразовать ответ API в формат `modelValue`.
- Выполнить сохранение изменений на backend.
- Показать пользователю ошибку, если backend отклонил изменения.
