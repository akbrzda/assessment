<template>
  <div class="textarea-group">
    <label v-if="label" class="textarea-label">
      {{ label }}
      <span v-if="required" class="textarea-required">*</span>
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :class="['textarea', `textarea-${size}`, { 'textarea-error': !!error }]"
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>
    <p v-if="error" class="textarea-error-text">{{ error }}</p>
    <p v-else-if="hint" class="textarea-hint-text">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: String,
  placeholder: String,
  error: String,
  hint: String,
  disabled: Boolean,
  readonly: Boolean,
  required: Boolean,
  rows: {
    type: Number,
    default: 3,
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.textarea-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.textarea-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.textarea-required {
  color: #ef4444;
}

.textarea {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 16px;
  resize: vertical;
  transition: all 0.2s ease;
}

.textarea:hover:not(:disabled) {
  border-color: var(--accent-blue);
}

.textarea:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px #007aff1a;
}

.textarea-sm,
.textarea-md,
.textarea-lg {
  font-size: 16px;
}

.textarea-sm {
  padding: 8px 12px;
}

.textarea-md {
  padding: 10px 16px;
}

.textarea-lg {
  padding: 12px 20px;
}

@media (min-width: 768px) {
  .textarea-sm {
    font-size: 14px;
  }

  .textarea-md {
    font-size: 15px;
  }

  .textarea-lg {
    font-size: 16px;
  }
}

.textarea::placeholder {
  color: var(--text-secondary);
}

.textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.textarea-error {
  border-color: #ef4444;
}

.textarea:focus.textarea-error {
  box-shadow: 0 0 0 3px #ef44441a;
}

.textarea-error-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

.textarea-hint-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
</style>
