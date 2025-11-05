<template>
  <div class="radio-group">
    <label v-if="label" class="radio-label-title">
      {{ label }}
      <span v-if="required" class="radio-required">*</span>
    </label>
    <div class="radio-options">
      <label v-for="option in options" :key="option.value" class="radio-option">
        <input
          :checked="modelValue === option.value"
          type="radio"
          :value="option.value"
          :disabled="disabled"
          class="radio-input"
          @change="$emit('update:modelValue', $event.target.value)"
        />
        <span class="radio-text">{{ option.label }}</span>
      </label>
    </div>
    <p v-if="error" class="radio-error-text">{{ error }}</p>
    <p v-else-if="hint" class="radio-hint-text">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  label: String,
  options: {
    type: Array,
    default: () => [],
  },
  error: String,
  hint: String,
  disabled: Boolean,
  required: Boolean,
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.radio-required {
  color: #ef4444;
}

.radio-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-primary);
  user-select: none;
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  appearance: none;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  background: var(--bg-primary);
  transition: all 0.2s ease;
  position: relative;
}

.radio-input:hover:not(:disabled) {
  border-color: var(--accent-blue);
}

.radio-input:checked {
  border-color: var(--accent-blue);
  background: var(--bg-primary);
}

.radio-input:checked::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: var(--accent-blue);
  border-radius: 50%;
}

.radio-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.radio-text {
  color: var(--text-primary);
}

.radio-error-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

.radio-hint-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
</style>
