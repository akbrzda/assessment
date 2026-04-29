<template>
  <RadioGroupRoot
    :model-value="modelValue"
    :disabled="disabled"
    :required="required"
    :orientation="orientation"
    :class="orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'flex flex-col gap-2'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <label
      v-for="option in options"
      :key="option.value"
      :class="['inline-flex items-start gap-2.5 select-none', option.disabled || disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']"
    >
      <RadioGroupItem
        :value="String(option.value)"
        :disabled="option.disabled"
        :class="[
          'flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'data-[state=checked]:border-primary',
          'data-[state=unchecked]:bg-background border-input hover:border-ring',
          sizeClass.box,
        ]"
      >
        <RadioGroupIndicator :class="['rounded-full bg-primary', sizeClass.dot]" />
      </RadioGroupItem>

      <span class="flex flex-col gap-0.5 pt-px">
        <span class="text-sm font-medium text-foreground leading-none">{{ option.label }}</span>
        <span v-if="option.description" class="text-xs text-muted-foreground leading-relaxed">{{ option.description }}</span>
      </span>
    </label>
  </RadioGroupRoot>
</template>

<script setup>
import { computed } from "vue";
import { RadioGroupRoot, RadioGroupItem, RadioGroupIndicator } from "reka-ui";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
  disabled: Boolean,
  required: Boolean,
  orientation: {
    type: String,
    default: "vertical",
    validator: (v) => ["vertical", "horizontal"].includes(v),
  },
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

const emit = defineEmits(["update:modelValue"]);

const sizeClass = computed(
  () =>
    ({
      sm: { box: "h-4 w-4", dot: "h-1.5 w-1.5" },
      md: { box: "h-5 w-5", dot: "h-2 w-2" },
      lg: { box: "h-6 w-6", dot: "h-2.5 w-2.5" },
    })[props.size],
);
</script>
