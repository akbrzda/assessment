<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" :for="selectId" class="flex items-center gap-1 text-[15px] font-medium text-foreground">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <select
        :id="selectId"
        :name="selectName"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="
          cn(
            'w-full border border-border rounded-xl bg-background text-foreground appearance-none pr-10 cursor-pointer transition-all duration-200',
            'focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10',
            'hover:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500',
            sizeClass,
          )
        "
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder && !modelValue" value="" disabled selected>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
          {{ option.label }}
        </option>
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground text-xs">▼</div>
    </div>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, useId } from "vue";
import { cn } from "@/lib/utils";

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
const sizeClass = computed(() => ({ sm: "py-2 px-3 text-sm", md: "py-2.5 px-4 text-[15px]", lg: "py-3 px-5 text-base" })[props.size]);

defineEmits(["update:modelValue"]);
</script>
