<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">
      {{ label }}
      <span v-if="required" class="text-destructive ml-0.5">*</span>
    </label>

    <div
      :class="[
        'inline-flex items-center rounded-xl border border-input bg-background shadow-sm overflow-hidden',
        disabled && 'opacity-50 pointer-events-none',
        error && 'border-destructive',
      ]"
    >
      <button
        type="button"
        :disabled="disabled || modelValue <= min"
        class="flex items-center justify-center px-3 h-9 text-muted-foreground hover:bg-accent hover:text-foreground transition border-none bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        @click="decrement"
      >
        <Icon name="Minus" :size="14" />
      </button>

      <input
        :value="modelValue"
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="w-14 text-center text-sm font-medium text-foreground bg-transparent border-x border-border focus:outline-none focus:ring-2 focus:ring-ring h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        @change="onInput($event.target.value)"
      />

      <button
        type="button"
        :disabled="disabled || modelValue >= max"
        class="flex items-center justify-center px-3 h-9 text-muted-foreground hover:bg-accent hover:text-foreground transition border-none bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        @click="increment"
      >
        <Icon name="Plus" :size="14" />
      </button>
    </div>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: -Infinity },
  max: { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
  label: String,
  error: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const clamp = (val) => Math.min(Math.max(val, props.min), props.max);

const increment = () => emit("update:modelValue", clamp(props.modelValue + props.step));
const decrement = () => emit("update:modelValue", clamp(props.modelValue - props.step));
const onInput = (val) => {
  const n = parseFloat(val);
  if (!isNaN(n)) emit("update:modelValue", clamp(n));
};
</script>
