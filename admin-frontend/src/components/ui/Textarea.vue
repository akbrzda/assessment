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
      :maxlength="maxLength || undefined"
      :rows="rows"
      :class="
        cn(
          'flex min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition resize-vertical',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'read-only:bg-muted read-only:cursor-default',
          error && 'border-destructive focus:ring-destructive/30',
          success && !error && 'border-accent-green focus:ring-accent-green/30',
        )
      "
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>

    <div class="flex items-start justify-between gap-2">
      <div class="flex-1">
        <p v-if="error" class="text-xs text-destructive">
          {{ error }}
          <span v-if="showCounter && maxLength" class="ml-1">{{ charCount }} / {{ maxLength }}</span>
        </p>
        <p v-else-if="success" class="text-xs text-accent-green">{{ success }}</p>
        <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
      </div>
      <span v-if="showCounter && maxLength && !error" :class="['text-xs shrink-0', isNearLimit ? 'text-destructive' : 'text-muted-foreground']"
        >{{ charCount }} / {{ maxLength }}</span
      >
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

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

const charCount = computed(() => (props.modelValue || "").length);
const isNearLimit = computed(() => props.maxLength && charCount.value >= props.maxLength * 0.9);
</script>
