<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :class="
        cn(
          'flex min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition resize-vertical',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'read-only:bg-muted read-only:cursor-default',
          error && 'border-destructive focus:ring-destructive/30',
        )
      "
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: String,
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  rows: { type: Number, default: 3 },
});

defineEmits(["update:modelValue"]);
</script>
