# UI Components

Единая система компонентов с минималистичным и современным дизайном.

## Принципы дизайна

- **Минимализм**: Минимум теней, меньше разноцветных элементов
- **Согласованность**: Единый стиль во всех компонентах
- **Доступность**: Фокус на UX и accessibility
- **Адаптивность**: Работает на всех устройствах

## Импорт компонентов

```javascript
// Импорт отдельных компонентов
import { Button, Card, Input } from "@/components/ui";

// Или прямой импорт
import Button from "@/components/ui/Button.vue";
```

## Компоненты

### Button

```vue
<Button variant="primary" size="md" @click="handleClick">
  Кнопка
</Button>
```

**Props:**

- `variant`: `primary | secondary | ghost | danger | success` (default: `primary`)
- `size`: `sm | md | lg` (default: `md`)
- `disabled`: `boolean`
- `loading`: `boolean`
- `icon`: `string`
- `fullWidth`: `boolean`

### Card

```vue
<Card title="Заголовок" padding="md">
  Контент карточки
</Card>
```

**Props:**

- `title`: `string`
- `padding`: `none | sm | md | lg` (default: `md`)

**Slots:**

- `default`: Основной контент

### Input

```vue
<Input v-model="value" label="Имя" placeholder="Введите имя" size="md" />
```

**Props:**

- `modelValue`: `string | number`
- `label`: `string`
- `type`: `string` (default: `text`)
- `placeholder`: `string`
- `error`: `string`
- `disabled`: `boolean`
- `readonly`: `boolean`
- `required`: `boolean`
- `size`: `sm | md | lg` (default: `md`)

### Select

```vue
<Select v-model="selected" :options="options" label="Выберите опцию" />
```

**Props:**

- `modelValue`: `string | number | null`
- `label`: `string`
- `options`: `Array<{ label: string, value: any }>`
- `placeholder`: `string`
- `disabled`: `boolean`
- `size`: `sm | md | lg` (default: `md`)

### Badge

```vue
<Badge variant="primary" size="md">Новое</Badge>
```

**Props:**

- `variant`: `default | primary | success | warning | danger` (default: `default`)
- `size`: `sm | md | lg` (default: `md`)

### Modal

```vue
<Modal v-model="isOpen" title="Заголовок" size="md">
  Контент модалки
  
  <template #footer>
    <Button @click="isOpen = false" variant="secondary">Отмена</Button>
    <Button @click="handleSave">Сохранить</Button>
  </template>
</Modal>
```

**Props:**

- `modelValue`: `boolean`
- `title`: `string`
- `size`: `sm | md | lg | xl` (default: `md`)

**Slots:**

- `default`: Основной контент
- `footer`: Футер с кнопками

### Preloader

```vue
<Preloader v-if="loading" />
```

Показывает спиннер загрузки.

## Цветовая палитра

Компоненты используют минималистичную цветовую схему:

- **Primary**: `#0088cc` - Основной акцент
- **Success**: `#10b981` - Успешные действия
- **Warning**: `#f59e0b` - Предупреждения
- **Danger**: `#ef4444` - Ошибки и удаление

## Тёмная тема

Все компоненты автоматически поддерживают тёмную тему через CSS-переменные.
