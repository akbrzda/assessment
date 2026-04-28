<template>
  <div class="flex flex-col gap-2">
    <label v-if="props.label" class="flex items-center gap-1 text-[15px] font-medium text-foreground">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500">*</span>
    </label>
    <div class="relative flex items-center">
      <slot name="prefix" />
      <input
        :value="props.modelValue"
        :type="props.type"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :min="props.min"
        :max="props.max"
        :class="
          cn(
            'w-full border border-border rounded-xl bg-background text-foreground transition-all duration-200',
            'placeholder:text-muted-foreground focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            props.error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
            sizeClass,
            $slots.prefix && 'pl-10',
          )
        "
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <slot name="suffix" />
    </div>
    <p v-if="props.error" class="text-sm text-red-500">{{ props.error }}</p>
    <p v-else-if="props.hint" class="text-sm text-muted-foreground">{{ props.hint }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

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

const sizeClass = computed(() => ({ sm: "py-2 px-3 text-sm", md: "py-2.5 px-4 text-[15px]", lg: "py-3 px-5 text-base" })[props.size]);
</script>
