<template>
  <div class="select-group">
    <label v-if="label" class="select-label" :for="selectId">
      {{ label }}
      <span v-if="required" class="select-required">*</span>
    </label>
    <div class="select-wrapper">
      <select
        :id="selectId"
        :name="selectName"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="['select', `select-${size}`, { 'select-error': !!error }]"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder && !modelValue" value="" disabled selected>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
          {{ option.label }}
        </option>
      </select>
      <div class="select-arrow">▼</div>
    </div>
    <p v-if="error" class="select-error-text">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, useId } from "vue";

const props = defineProps({
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
  id: String,
  name: String,
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
});

const localId = typeof useId === "function" ? useId() : `select-${Math.random().toString(36).slice(2, 9)}`;
const selectId = computed(() => props.id || localId);
const selectName = computed(() => props.name || selectId.value);

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.select-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.select-required {
  color: #ef4444;
}

.select-wrapper {
  position: relative;
}

.select {
  width: 100%;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  appearance: none;
  padding-right: 40px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-sm {
  font-size: 14px;
  padding: 8px 12px;
}

.select-md {
  font-size: 15px;
  padding: 10px 16px;
}

.select-lg {
  font-size: 16px;
  padding: 12px 20px;
}

.select:hover:not(:disabled) {
  border-color: var(--accent-blue);
}

.select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
  font-size: 12px;
}

.select-error {
  border-color: #ef4444;
}

.select:focus.select-error {
  box-shadow: 0 0 0 3px #ef44441a;
}

.select-error-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}
</style>
