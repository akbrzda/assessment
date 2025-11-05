<template>
  <div class="checkbox-group">
    <label v-if="label" class="group-label">
      {{ label }}
      <span v-if="required" class="group-required">*</span>
    </label>
    <div class="checkboxes-container">
      <label v-for="option in options" :key="option.value" class="checkbox-item">
        <input
          :checked="modelValue.includes(option.value)"
          type="checkbox"
          :value="option.value"
          :disabled="disabled"
          class="checkbox-input"
          @change="handleChange"
        />
        <span class="checkbox-text">{{ option.label }}</span>
      </label>
    </div>
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-else-if="hint" class="hint-text">{{ hint }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
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

const emit = defineEmits(["update:modelValue"]);

const handleChange = (event) => {
  const value = event.target.value;
  const checked = event.target.checked;
  let newValue = [...props.modelValue];

  if (checked) {
    if (!newValue.includes(value)) {
      newValue.push(value);
    }
  } else {
    newValue = newValue.filter((v) => v !== value);
  }

  emit("update:modelValue", newValue);
};
</script>

<style scoped>
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-required {
  color: #ef4444;
}

.checkboxes-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-primary);
  user-select: none;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.checkbox-item:hover {
  background: var(--bg-secondary);
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  appearance: none;
  border: 2px solid var(--divider);
  border-radius: 6px;
  background: var(--bg-primary);
  transition: all 0.2s ease;
  position: relative;
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
  content: "✓";
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

.error-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

.hint-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
</style>
