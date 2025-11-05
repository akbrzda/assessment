<template>
  <div class="checkbox-group">
    <label class="checkbox-label">
      <input
        :checked="modelValue"
        type="checkbox"
        :disabled="disabled"
        class="checkbox-input"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <span v-if="label" class="checkbox-text">{{ label }}</span>
      <span v-if="required" class="checkbox-required">*</span>
    </label>
    <p v-if="error" class="checkbox-error-text">{{ error }}</p>
    <p v-else-if="hint" class="checkbox-hint-text">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  label: String,
  error: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-primary);
  user-select: none;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  border: 2px solid var(--divider);
  border-radius: 6px;
  background-color: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-input:hover:not(:disabled) {
  border-color: var(--accent-blue);
}

.checkbox-input:checked {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
}

.checkbox-input:checked::after {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: bold;
}

.checkbox-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-text {
  color: var(--text-primary);
}

.checkbox-required {
  color: #ef4444;
}

.checkbox-error-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

.checkbox-hint-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
</style>
