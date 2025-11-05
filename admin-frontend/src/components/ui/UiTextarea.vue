<template>
  <div class="ui-textarea-wrapper" :class="{ 'ui-textarea-error': error }">
    <label v-if="label" :for="textareaId" class="ui-textarea-label">
      {{ label }}
      <span v-if="required" class="ui-textarea-required">*</span>
    </label>

    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="textareaClasses"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    ></textarea>

    <p v-if="error" class="ui-textarea-error-text">{{ error }}</p>
    <p v-else-if="hint" class="ui-textarea-hint">{{ hint }}</p>
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
  rows: {
    type: Number,
    default: 4,
  },
});

const emit = defineEmits(["update:modelValue", "blur", "focus"]);

const textareaId = ref(`textarea-${Math.random().toString(36).substr(2, 9)}`);

const textareaClasses = computed(() => {
  const classes = ["ui-textarea-field"];

  if (props.error) classes.push("ui-textarea-invalid");
  if (props.disabled) classes.push("ui-textarea-disabled");

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
.ui-textarea-wrapper {
  width: 100%;
}

.ui-textarea-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.ui-textarea-required {
  color: var(--accent-red);
  margin-left: 0.125rem;
}

.ui-textarea-field {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background-color: var(--surface-card);
  border: 1px solid var(--divider);
  border-radius: 8px;
  font-size: 0.9375rem;
  color: var(--text-primary);
  transition: all 0.2s ease;
  outline: none;
  resize: vertical;
  min-height: 5rem;
  font-family: inherit;
  line-height: 1.5;
}

.ui-textarea-field::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.ui-textarea-field:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px var(--accent-blue-soft);
}

.ui-textarea-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--bg-secondary);
}

.ui-textarea-invalid {
  border-color: var(--accent-red);
}

.ui-textarea-invalid:focus {
  box-shadow: 0 0 0 3px var(--accent-red-soft);
}

.ui-textarea-error-text {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--accent-red);
}

.ui-textarea-hint {
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .ui-textarea-field {
    font-size: 1rem;
  }
}
</style>
