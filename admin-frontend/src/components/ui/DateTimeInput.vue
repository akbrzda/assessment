<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <div class="relative flex items-center">
      <div class="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
        <Icon name="Clock" :size="15" />
      </div>
      <input
        type="time"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :class="[
          'flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[color-scheme:light] dark:[color-scheme:dark]',
          error && 'border-destructive focus:ring-destructive/30',
        ]"
        @change="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

defineProps({
  modelValue: { type: String, default: "" },
  label: String,
  error: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
  min: String,
  max: String,
  step: { type: Number, default: 60 },
});

defineEmits(["update:modelValue"]);
</script>
