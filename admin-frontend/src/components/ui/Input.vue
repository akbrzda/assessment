<template>
  <div class="input-group">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="input-required">*</span>
    </label>
    <div class="input-wrapper">
      <slot name="prefix"></slot>
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="['input', `input-${size}`, { 'input-error': !!error }]"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <slot name="suffix"></slot>
    </div>
    <p v-if="error" class="input-error-text">{{ error }}</p>
    <p v-else-if="hint" class="input-hint-text">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  label: String,
  type: {
    type: String,
    default: "text",
  },
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  readonly: Boolean,
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
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.input-required {
  color: #ef4444;
}

.input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s ease;
  background-color: var(--bg-primary);
}

.input-wrapper:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

.input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  padding: 0.625rem 1rem;
}

.input-sm {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}

.input-md {
  font-size: 0.9375rem;
  padding: 0.625rem 1rem;
}

.input-lg {
  font-size: 1rem;
  padding: 0.75rem 1.25rem;
}

.input::placeholder {
  color: var(--text-secondary);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error {
  border-color: #ef4444;
}

.input:focus.input-error {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-error-text {
  font-size: 0.8125rem;
  color: #ef4444;
  margin: 0;
}

.input-hint-text {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
}
</style>
