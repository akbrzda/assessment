<template>
  <div class="ui-input-wrapper" :class="{ 'ui-input-error': error }">
    <label v-if="label" :for="inputId" class="ui-input-label">
      {{ label }}
      <span v-if="required" class="ui-input-required">*</span>
    </label>

    <div class="ui-input-container">
      <span v-if="icon" class="ui-input-icon">{{ icon }}</span>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :min="min"
        :max="max"
        :step="step"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />

      <span v-if="suffix" class="ui-input-suffix">{{ suffix }}</span>
    </div>

    <p v-if="error" class="ui-input-error-text">{{ error }}</p>
    <p v-else-if="hint" class="ui-input-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  type: {
    type: String,
    default: "text",
  },
  placeholder: String,
  disabled: Boolean,
  required: Boolean,
  error: String,
  hint: String,
  icon: String,
  suffix: String,
  min: [String, Number],
  max: [String, Number],
  step: [String, Number],
});

const emit = defineEmits(["update:modelValue", "blur", "focus"]);

const inputId = ref(`input-${Math.random().toString(36).substr(2, 9)}`);

const inputClasses = computed(() => {
  const classes = ["ui-input-field"];

  if (props.icon) classes.push("ui-input-has-icon");
  if (props.suffix) classes.push("ui-input-has-suffix");
  if (props.error) classes.push("ui-input-invalid");
  if (props.disabled) classes.push("ui-input-disabled");

  return classes.join(" ");
});

const handleInput = (event) => {
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
.ui-input-wrapper {
  width: 100%;
}

.ui-input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.ui-input-required {
  color: var(--accent-red);
  margin-left: 0.125rem;
}

.ui-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.ui-input-field {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background-color: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 8px;
  font-size: 0.9375rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  outline: none;
}

.ui-input-field::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.ui-input-field:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

.ui-input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-secondary);
}

.ui-input-has-icon {
  padding-left: 2.5rem;
}

.ui-input-has-suffix {
  padding-right: 3rem;
}

.ui-input-icon {
  position: absolute;
  left: 0.875rem;
  font-size: 1rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.ui-input-suffix {
  position: absolute;
  right: 0.875rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.ui-input-invalid {
  border-color: var(--accent-red);
}

.ui-input-invalid:focus {
  box-shadow: 0 0 0 3px var(--accent-red-soft);
}

.ui-input-error-text {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--accent-red);
}

.ui-input-hint {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .ui-input-field {
    font-size: 1rem;
  }
}
</style>
