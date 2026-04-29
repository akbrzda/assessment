<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <ComboboxRoot
      v-model="model"
      :multiple="multiple"
      :disabled="disabled"
      :filter-function="filterFunction"
      :display-value="displayValue"
      :class="'relative'"
      @update:open="onOpenChange"
    >
      <!-- Триггер-поле -->
      <ComboboxAnchor
        :class="[
          'flex min-h-9 w-full items-center gap-1.5 flex-wrap rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition',
          'focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent',
          'hover:border-ring',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-destructive focus-within:ring-destructive/30',
          multiple && selectedItems.length && 'py-1.5',
          !multiple && 'py-0',
          sizeClass,
        ]"
      >
        <!-- Чипы выбранных значений (только при multiple) -->
        <template v-if="multiple">
          <span
            v-for="item in selectedItems"
            :key="item.value"
            class="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {{ item.label }}
            <button
              type="button"
              class="opacity-60 hover:opacity-100 transition cursor-pointer bg-transparent border-none p-0"
              @click.stop="removeItem(item.value)"
            >
              <Icon name="X" :size="11" />
            </button>
          </span>
        </template>

        <ComboboxInput
          :placeholder="inputPlaceholder"
          :class="[
            'flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none',
            !multiple && 'w-full h-full py-0',
            multiple && 'py-0.5',
          ]"
          :display-value="(opt) => (!multiple && opt ? opt.label : '')"
        />

        <!-- Спиннер загрузки или стрелка -->
        <div class="ml-auto flex items-center gap-1 shrink-0">
          <span
            v-if="loading"
            class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground"
          />
          <button
            v-else-if="clearable && hasValue"
            type="button"
            tabindex="-1"
            class="text-muted-foreground hover:text-foreground transition bg-transparent border-none cursor-pointer p-0"
            @click.stop="clearAll"
          >
            <Icon name="X" :size="13" />
          </button>
          <Icon name="ChevronDown" :size="14" class="text-muted-foreground opacity-70 transition" :class="isOpen && 'rotate-180'" />
        </div>
      </ComboboxAnchor>

      <!-- Выпадающий список -->
      <ComboboxPortal>
        <ComboboxContent
          :class="[
            'z-[9999] w-[var(--reka-combobox-trigger-width)] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg',
          ]"
          position="popper"
          :side-offset="4"
        >
          <ComboboxViewport class="max-h-[240px] overflow-y-auto p-1">
            <ComboboxEmpty class="py-6 text-center text-sm text-muted-foreground">
              {{ emptyText }}
            </ComboboxEmpty>

            <ComboboxItem
              v-for="opt in options"
              :key="opt.value"
              :value="opt"
              :disabled="opt.disabled"
              :class="[
                'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-3 pr-8 text-sm outline-none',
                'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
              ]"
            >
              <Icon v-if="opt.icon" :name="opt.icon" :size="14" class="text-muted-foreground shrink-0" />
              <span class="flex-1">{{ opt.label }}</span>
              <ComboboxItemIndicator class="absolute right-2 flex items-center justify-center">
                <Icon name="Check" :size="14" class="text-primary" />
              </ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
} from "reka-ui";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: {
    type: [String, Number, Array, null],
    default: null,
  },
  options: {
    type: Array,
    default: () => [],
  },
  label: String,
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
  multiple: Boolean,
  clearable: { type: Boolean, default: false },
  loading: Boolean,
  emptyText: { type: String, default: "Ничего не найдено" },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const isOpen = ref(false);

const onOpenChange = (val) => {
  isOpen.value = val;
};

const sizeClass = computed(
  () =>
    ({
      sm: "min-h-8 text-xs",
      md: "min-h-9",
      lg: "min-h-10 text-base",
    })[props.size],
);

const inputPlaceholder = computed(() => {
  if (props.multiple && selectedItems.value.length) return "";
  return props.placeholder || "Выберите...";
});

const model = computed({
  get: () => {
    if (props.multiple) {
      const vals = Array.isArray(props.modelValue) ? props.modelValue : [];
      return props.options.filter((o) => vals.includes(o.value));
    }
    return props.options.find((o) => o.value === props.modelValue) ?? null;
  },
  set: (val) => {
    if (props.multiple) {
      const arr = Array.isArray(val) ? val : [];
      emit(
        "update:modelValue",
        arr.map((o) => o.value),
      );
      emit(
        "change",
        arr.map((o) => o.value),
      );
    } else {
      emit("update:modelValue", val?.value ?? null);
      emit("change", val?.value ?? null);
    }
  },
});

const selectedItems = computed(() => {
  if (!props.multiple) return [];
  const vals = Array.isArray(props.modelValue) ? props.modelValue : [];
  return props.options.filter((o) => vals.includes(o.value));
});

const hasValue = computed(() => {
  if (props.multiple) return Array.isArray(props.modelValue) && props.modelValue.length > 0;
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== "";
});

const removeItem = (value) => {
  if (!props.multiple) return;
  const current = Array.isArray(props.modelValue) ? props.modelValue : [];
  emit(
    "update:modelValue",
    current.filter((v) => v !== value),
  );
};

const clearAll = () => {
  emit("update:modelValue", props.multiple ? [] : null);
};

const filterFunction = (list, search) => {
  if (!search) return list;
  const s = search.toLowerCase();
  return list.filter((item) => item.label?.toLowerCase().includes(s));
};

const displayValue = (opt) => opt?.label ?? "";
</script>
