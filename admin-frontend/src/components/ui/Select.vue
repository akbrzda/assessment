<template>
  <div class="select-group">
    <label v-if="label" class="select-label">
      {{ label }}
      <span v-if="required" class="select-required">*</span>
    </label>
    <div class="select-wrapper">
      <select
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="['select', `select-${size}`, { 'select-error': !!error }]"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <div class="select-arrow">▼</div>
    </div>
    <p v-if="error" class="select-error-text">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null,
  },
  label: String,
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.select-required {
  color: #ef4444;
}

.select-wrapper {
  position: relative;
}

.select {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-sm {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}

.select-md {
  font-size: 0.9375rem;
  padding: 0.625rem 1rem;
}

.select-lg {
  font-size: 1rem;
  padding: 0.75rem 1.25rem;
}

.select:hover:not(:disabled) {
  border-color: var(--accent-blue);
}

.select:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-arrow {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.select-error {
  border-color: #ef4444;
}

.select:focus.select-error {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.select-error-text {
  font-size: 0.8125rem;
  color: #ef4444;
  margin: 0;
}
</style>
