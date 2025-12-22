<template>
  <div class="input-group">
    <label v-if="props.label" class="input-label">
      {{ props.label }}
      <span v-if="props.required" class="input-required">*</span>
    </label>
    <div class="input-wrapper">
      <slot name="prefix"></slot>
      <input
        :value="props.modelValue"
        :type="props.type"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :min="props.min"
        :max="props.max"
        :class="['input', `input-${props.size}`, { 'input-error': !!props.error }]"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <slot name="suffix"></slot>
    </div>
    <p v-if="props.error" class="input-error-text">{{ props.error }}</p>
    <p v-else-if="props.hint" class="input-hint-text">{{ props.hint }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
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
  min: {
    type: [String, Number],
    default: undefined,
  },
  max: {
    type: [String, Number],
    default: undefined,
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
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.input-required {
  color: #ef4444;
}

.input-wrapper {
  position: relative;

  .input {
    flex: 1;
    border: none;
    background: transparent;
    font-family: inherit;
    outline: none;
    padding: 10px 16px;
    display: flex;
    align-items: center;

    width: 100%;
    border: 1px solid var(--divider);
    border-radius: 12px;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: all 0.2s ease;
  }
}

.input-sm,
.input-md,
.input-lg {
  font-size: 16px;
}

.input-sm {
  padding: 8px 12px;
}

.input-md {
  padding: 10px 16px;
}

.input-lg {
  padding: 12px 20px;
}

@media (min-width: 768px) {
  .input-sm {
    font-size: 14px;
  }

  .input-md {
    font-size: 15px;
  }

  .input-lg {
    font-size: 16px;
  }
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
  box-shadow: 0 0 0 3px #ef44441a;
}

.input-error-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

.input-hint-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
</style>
