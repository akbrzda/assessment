<template>
  <textarea
    :value="modelValue ?? ''"
    @input="handleInput"
    v-bind="textareaAttrs"
  />
</template>

<script setup>
import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  modelValue: {
    type: [String, null],
    default: ''
  },
  modelModifiers: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);
const attrs = useAttrs();

const textareaAttrs = computed(() => {
  const { class: className, ...rest } = attrs;
  const classes = ['base-control', 'base-control--textarea'];
  if (className) {
    classes.push(className);
  }
  return {
    ...rest,
    class: classes.join(' ')
  };
});

function transform(value) {
  let next = value;
  if (props.modelModifiers.trim && typeof next === 'string') {
    next = next.trim();
  }
  return next;
}

function handleInput(event) {
  emit('update:modelValue', transform(event.target.value));
}
</script>

<style scoped>
.base-control {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #444;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.3;
  background: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #0a0a0a);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  resize: vertical;
  min-height: 96px;
}

.base-control:focus {
  outline: none;
  border-color: var(--tg-theme-button-color, #0a84ff);
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.12);
}
</style>