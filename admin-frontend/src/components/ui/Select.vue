<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <SelectRoot :model-value="normalizedModelValue" :disabled="disabled" @update:model-value="handleModelUpdate">
      <SelectTrigger
        :id="selectId"
        :class="[
          'flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors',
          'hover:border-ring cursor-pointer',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive' : '',
          sizeClass,
        ]"
      >
        <SelectValue :placeholder="placeholder || 'Выберите...'" class="truncate" />
        <Icon name="ChevronDown" :size="14" class="shrink-0 text-muted-foreground" />
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          class="z-[9999] w-[var(--reka-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg"
          position="popper"
          :side-offset="4"
        >
          <SelectViewport class="p-1">
            <template v-if="groups.length">
              <SelectGroup v-for="(group, gi) in groups" :key="gi">
                <SelectLabel v-if="group.label" class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {{ group.label }}
                </SelectLabel>
                <SelectItem
                  v-for="opt in group.options"
                  :key="opt.value"
                  :value="normalizeOptionValue(opt.value)"
                  :disabled="opt.disabled"
                  class="relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium"
                >
                  <SelectItemText>{{ opt.label }}</SelectItemText>
                  <SelectItemIndicator class="absolute right-2.5 flex items-center">
                    <Icon name="Check" :size="14" class="text-primary" />
                  </SelectItemIndicator>
                </SelectItem>
              </SelectGroup>
            </template>

            <template v-else>
              <SelectItem
                v-for="opt in options"
                :key="opt.value"
                :value="normalizeOptionValue(opt.value)"
                :disabled="opt.disabled"
                class="relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium"
              >
                <SelectItemText>{{ opt.label }}</SelectItemText>
                <SelectItemIndicator class="absolute right-2.5 flex items-center">
                  <Icon name="Check" :size="14" class="text-primary" />
                </SelectItemIndicator>
              </SelectItem>
            </template>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed, useId } from "vue";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectGroup,
  SelectLabel,
} from "reka-ui";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const EMPTY_SELECT_VALUE = "__empty_select_value__";

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null,
  },
  label: String,
  options: {
    type: Array,
    default: () => [],
  },
  groups: {
    type: Array,
    default: () => [],
  },
  placeholder: String,
  hint: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
  id: String,
  name: String,
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

const localId = typeof useId === "function" ? useId() : `select-${Math.random().toString(36).slice(2, 9)}`;
const selectId = computed(() => props.id || localId);
const sizeClass = computed(() => ({ sm: "h-8 text-xs", md: "h-9", lg: "h-10 text-base" })[props.size]);
const normalizedModelValue = computed(() => normalizeOptionValue(props.modelValue));

const emit = defineEmits(["update:modelValue", "change"]);

function normalizeOptionValue(value) {
  if (value === "" || value === null || value === undefined) {
    return EMPTY_SELECT_VALUE;
  }
  return String(value);
}

function handleModelUpdate(value) {
  const normalizedValue = value === EMPTY_SELECT_VALUE ? "" : value;
  emit("update:modelValue", normalizedValue);
  emit("change", normalizedValue);
}
</script>
