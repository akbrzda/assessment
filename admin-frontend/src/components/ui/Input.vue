<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="props.label" class="text-sm font-medium text-foreground leading-none">
      {{ props.label }}
      <span v-if="props.required" class="text-destructive ml-0.5">*</span>
    </label>

    <div class="relative flex items-center">
      <!-- Левая иконка: слот или авто по типу -->
      <div v-if="hasPrefix" class="pointer-events-none absolute left-3 flex items-center text-muted-foreground z-10">
        <slot name="prefix">
          <Icon :name="autoIcon" :size="15" />
        </slot>
      </div>

      <input
        :value="props.modelValue"
        :type="currentType"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :min="props.min"
        :max="props.max"
        :class="[
          'flex w-full rounded-xl border border-input bg-background text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'read-only:bg-muted read-only:cursor-default',
          props.error ? 'border-destructive focus:ring-destructive/30' : '',
          props.success && !props.error ? 'border-accent-green focus:ring-accent-green/30' : '',
          sizeClass,
          paddingClass,
        ]"
        @input="$emit('update:modelValue', $event.target.value)"
      />

      <!-- Правая иконка / password-toggle -->
      <div v-if="hasSuffix" class="absolute right-3 flex items-center gap-1.5">
        <slot name="suffix" />
        <button
          v-if="props.type === 'password'"
          type="button"
          tabindex="-1"
          class="flex items-center text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0"
          @click="showPassword = !showPassword"
        >
          <Icon :name="showPassword ? 'EyeOff' : 'Eye'" :size="15" />
        </button>
        <Icon v-else-if="props.error" name="CircleX" :size="15" class="text-destructive" />
        <Icon v-else-if="props.success" name="CircleCheck" :size="15" class="text-accent-green" />
      </div>
    </div>

    <p v-if="props.error" class="text-xs text-destructive">{{ props.error }}</p>
    <p v-else-if="props.success" class="text-xs text-accent-green">{{ props.success }}</p>
    <p v-else-if="props.hint" class="text-xs text-muted-foreground flex items-center gap-1">
      <Icon v-if="props.hintIcon" name="Info" :size="12" class="shrink-0" />
      {{ props.hint }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref, useSlots } from "vue";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: String,
  type: { type: String, default: "text" },
  placeholder: String,
  error: String,
  hint: String,
  hintIcon: Boolean,
  success: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

defineEmits(["update:modelValue"]);

const slots = useSlots();
const showPassword = ref(false);

const currentType = computed(() => {
  if (props.type === "password") return showPassword.value ? "text" : "password";
  return props.type;
});

const autoIcon = computed(() => {
  const map = { search: "Search", url: "Link", email: "Mail" };
  return map[props.type] ?? null;
});

// Prefix есть если: явный слот prefix ИЛИ тип имеет авто-иконку
const hasPrefix = computed(() => !!slots.prefix || !!autoIcon.value);

// Suffix есть если: явный слот suffix ИЛИ пароль ИЛИ есть статус
const hasSuffix = computed(() => !!slots.suffix || props.type === "password" || !!props.error || !!props.success);

const sizeClass = computed(
  () =>
    ({
      sm: "h-8 text-xs",
      md: "h-9",
      lg: "h-10 text-base",
    })[props.size],
);

const paddingClass = computed(() => {
  const base = props.size === "lg" ? 4 : 3;
  const pl = hasPrefix.value ? "pl-9" : `pl-${base}`;
  const pr = hasSuffix.value ? "pr-9" : `pr-${base}`;
  return `${pl} ${pr}`;
});
</script>
