<template>
  <input
    :type="type"
    class="base-control"
    :value="modelValue ?? ''"
    @input="handleInput"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  modelModifiers: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

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

function handleInput(event) {
  const { value } = event.target;
  emit('update:modelValue', transform(value));
}
</script>

<style scoped>
.base-control {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.3;
  background: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #0a0a0a);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.base-control:focus {
  outline: none;
  border-color: var(--tg-theme-button-color, #0a84ff);
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.12);
}

.base-control:disabled,
.base-control[readonly] {
  background: rgba(0, 0, 0, 0.03);
  color: var(--tg-theme-hint-color, #6f7a8b);
  cursor: not-allowed;
}
</style>
