<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <SelectRoot :model-value="normalizedModelValue" :disabled="disabled" @update:model-value="handleModelUpdate">
      <SelectTrigger
        :id="selectId"
        :class="
          cn(
            'flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-transparent',
            'hover:border-ring transition',
            'disabled:cursor-not-allowed disabled:opacity-50',
            '[&>span]:truncate',
            error && 'border-destructive focus:ring-destructive/30',
            sizeClass,
          )
        "
      >
        <SelectValue :placeholder="placeholder || 'Выберите...'" />
        <ChevronDownIcon :size="14" class="shrink-0 text-muted-foreground opacity-70" />
      </SelectTrigger>

      <SelectContent
        :class="
          cn(
            'relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          )
        "
        position="popper"
        :side-offset="4"
      >
        <SelectViewport class="p-1">
          <template v-if="groups.length">
            <SelectGroup v-for="(group, gi) in groups" :key="gi">
              <SelectLabel v-if="group.label" class="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {{ group.label }}
              </SelectLabel>
              <SelectItem
                v-for="opt in group.options"
                :key="opt.value"
                :value="normalizeOptionValue(opt.value)"
                :disabled="opt.disabled"
                :class="
                  cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-3 pr-8 text-sm outline-none',
                    'focus:bg-accent focus:text-accent-foreground',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    'data-[state=checked]:font-medium',
                  )
                "
              >
                <SelectItemText>{{ opt.label }}</SelectItemText>
                <SelectItemIndicator class="absolute right-2 flex items-center justify-center">
                  <CheckIcon :size="14" />
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
              :class="
                cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-3 pr-8 text-sm outline-none',
                  'focus:bg-accent focus:text-accent-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  'data-[state=checked]:font-medium',
                )
              "
            >
              <SelectItemText>{{ opt.label }}</SelectItemText>
              <SelectItemIndicator class="absolute right-2 flex items-center justify-center">
                <CheckIcon :size="14" />
              </SelectItemIndicator>
            </SelectItem>
          </template>
        </SelectViewport>
      </SelectContent>
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
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectGroup,
  SelectLabel,
} from "reka-ui";
import { ChevronDown as ChevronDownIcon, Check as CheckIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";

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
