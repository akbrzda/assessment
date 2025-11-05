<template>
  <div class="ui-select-wrapper" :class="{ 'ui-select-error': error }">
    <label v-if="label" :for="selectId" class="ui-select-label">
      {{ label }}
      <span v-if="required" class="ui-select-required">*</span>
    </label>

    <div class="ui-select-container">
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="selectClasses"
        @change="handleChange"
        @blur="handleBlur"
        @focus="handleFocus"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <span class="ui-select-arrow">▼</span>
    </div>

    <p v-if="error" class="ui-select-error-text">{{ error }}</p>
    <p v-else-if="hint" class="ui-select-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  placeholder: String,
  disabled: Boolean,
  required: Boolean,
  error: String,
  hint: String,
  options: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue", "blur", "focus"]);

const selectId = ref(`select-${Math.random().toString(36).substr(2, 9)}`);

const selectClasses = computed(() => {
  const classes = ["ui-select-field"];

  if (props.error) classes.push("ui-select-invalid");
  if (props.disabled) classes.push("ui-select-disabled");

  return classes.join(" ");
});

const handleChange = (event) => {
  emit("update:modelValue", event.target.value);
};

const handleBlur = (event) => {
  emit("blur", event);
};

const handleFocus = (event) => {
  emit("focus", event);
};
</script>

<style scoped>
.ui-select-wrapper {
  width: 100%;
}

.ui-select-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.ui-select-required {
  color: var(--accent-red);
  margin-left: 0.125rem;
}

.ui-select-container {
  position: relative;
  display: flex;
  align-items: center;
}

.ui-select-field {
  width: 100%;
  padding: 0.625rem 2.5rem 0.625rem 0.875rem;
  background-color: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 8px;
  font-size: 0.9375rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.ui-select-field:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

.ui-select-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-secondary);
}

.ui-select-arrow {
  position: absolute;
  right: 0.875rem;
  font-size: 0.625rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.ui-select-invalid {
  border-color: var(--accent-red);
}

.ui-select-invalid:focus {
  box-shadow: 0 0 0 3px var(--accent-red-soft);
}

.ui-select-error-text {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--accent-red);
}

.ui-select-hint {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .ui-select-field {
    font-size: 1rem;
  }
}
</style>
