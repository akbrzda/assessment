<template>
  <div class="base-select" :class="{ 'base-select--disabled': isDisabled }">
    <select
      :class="selectClass"
      :value="modelValue ?? ''"
      @change="handleChange"
      v-bind="selectAttrs"
    >
      <slot />
    </select>
    <span class="base-select__icon">▾</span>
  </div>
</template>

<script setup>
import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: ''
  },
  modelModifiers: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

const attrs = useAttrs();

const selectAttrs = computed(() => {
  const result = { ...attrs };
  delete result.class;
  return result;
});

const selectClass = computed(() => {
  const classes = ['base-control', 'base-control--select'];
  if (attrs.class) {
    classes.push(attrs.class);
  }
  return classes;
});

const isDisabled = computed(() => {
  const value = attrs.disabled;
  return value === '' || value === true || value === 'disabled';
});

function transform(value) {
  let next = value;
  if (props.modelModifiers.trim && typeof next === 'string') {
    next = next.trim();
  }
  if (props.modelModifiers.number) {
    const numeric = parseFloat(next);
    if (!Number.isNaN(numeric)) {
      next = numeric;
    }
  }
  return next;
}

function handleChange(event) {
  emit('update:modelValue', transform(event.target.value));
}
</script>

<style scoped>
.base-select {
  position: relative;
  width: 100%;
}

.base-control {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #444;
  padding: 10px 14px;
  padding-right: 34px;
  font-size: 14px;
  line-height: 1.3;
  background: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #0a0a0a);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.base-control:focus {
  outline: none;
  border-color: var(--tg-theme-button-color, #0a84ff);
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.12);
}

.base-control:disabled {
  background: rgba(0, 0, 0, 0.03);
  color: var(--tg-theme-hint-color, #6f7a8b);
  cursor: not-allowed;
}

.base-select--disabled .base-select__icon {
  color: var(--tg-theme-hint-color, #6f7a8b);
  opacity: 0.7;
}

.base-select__icon {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  font-size: 12px;
  pointer-events: none;
  color: var(--tg-theme-hint-color, #6f7a8b);
}
</style>
