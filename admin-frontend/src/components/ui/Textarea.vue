<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>
    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :maxlength="maxLength || undefined"
      :rows="rows"
      :aria-invalid="Boolean(error)"
      :aria-describedby="messageId"
      :class="
        cn(
          'flex min-h-20 w-full rounded-xl border border-input bg-[hsl(var(--field-surface))] px-3 py-2 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition resize-vertical',
          'hover:border-[hsl(var(--field-border-strong))] hover:bg-[hsl(var(--field-surface-hover))]',
          'disabled:cursor-not-allowed disabled:text-muted-foreground disabled:bg-[hsl(var(--field-surface-disabled))] disabled:opacity-100',
          'read-only:bg-muted read-only:cursor-default',
          error && 'border-[hsl(var(--field-border-error))] bg-[hsl(var(--field-error-bg))] focus:ring-[hsl(var(--field-border-error)/0.35)]',
          success && !error && 'border-[hsl(var(--field-border-success))] bg-[hsl(var(--field-success-bg))] focus:ring-[hsl(var(--field-border-success)/0.35)]',
        )
      "
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>

    <div class="flex items-start justify-between gap-2">
      <div class="flex-1">
        <p v-if="error" :id="messageId" class="text-xs text-destructive font-medium flex items-center gap-1.5">
          <Icon name="CircleAlert" :size="12" class="shrink-0" />
          {{ error }}
          <span v-if="showCounter && maxLength" class="ml-1">{{ charCount }} / {{ maxLength }}</span>
        </p>
        <p v-else-if="success" :id="messageId" class="text-xs text-accent-green font-medium flex items-center gap-1.5">
          <Icon name="CircleCheck" :size="12" class="shrink-0" />
          {{ success }}
        </p>
        <p v-else-if="hint" :id="messageId" class="text-xs text-muted-foreground">{{ hint }}</p>
      </div>
      <span v-if="showCounter && maxLength && !error" :class="['text-xs shrink-0', isNearLimit ? 'text-destructive' : 'text-muted-foreground']"
        >{{ charCount }} / {{ maxLength }}</span
      >
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from "vue";
import { cn } from "@/lib/utils";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: String,
  placeholder: String,
  error: String,
  hint: String,
  success: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  rows: { type: Number, default: 3 },
  maxLength: { type: Number, default: null },
  showCounter: { type: Boolean, default: false },
});

defineEmits(["update:modelValue"]);
const localId = typeof useId === "function" ? useId() : `textarea-${Math.random().toString(36).slice(2, 9)}`;
const textareaId = computed(() => `field-${localId}`);
const messageId = computed(() => (props.error || props.success || props.hint ? `${textareaId.value}-message` : undefined));

const charCount = computed(() => (props.modelValue || "").length);
const isNearLimit = computed(() => props.maxLength && charCount.value >= props.maxLength * 0.9);
</script>
