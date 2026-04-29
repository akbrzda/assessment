<template>
  <div class="flex flex-col gap-1.5">
    <label :class="['inline-flex items-start gap-2.5 select-none', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']">
      <CheckboxRoot
        :checked="indeterminate ? 'indeterminate' : modelValue"
        :disabled="disabled"
        :required="required"
        :class="[
          'flex shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
          'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary',
          'data-[state=unchecked]:bg-background',
          error ? 'border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive' : 'border-input hover:border-ring',
          sizeClass.box,
        ]"
        @update:checked="onUpdate"
      >
        <CheckboxIndicator class="flex items-center justify-center text-primary-foreground">
          <Icon :name="indeterminate ? 'Minus' : 'Check'" :size="sizeClass.icon" :stroke-width="3" />
        </CheckboxIndicator>
      </CheckboxRoot>

      <span v-if="label || $slots.default" class="flex flex-col gap-0.5 pt-px">
        <span :class="['text-sm font-medium text-foreground leading-none', error && 'text-destructive']">
          <slot>{{ label }}</slot>
          <span v-if="required" class="text-destructive ml-0.5">*</span>
        </span>
        <span v-if="description" class="text-xs text-muted-foreground leading-relaxed">{{ description }}</span>
      </span>
    </label>

    <p v-if="error" class="text-xs text-destructive ml-7">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { CheckboxRoot, CheckboxIndicator } from "reka-ui";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  indeterminate: {
    type: Boolean,
    default: false,
  },
  label: String,
  description: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

const emit = defineEmits(["update:modelValue"]);

const onUpdate = (val) => {
  if (val === "indeterminate") return;
  emit("update:modelValue", val);
};

const sizeClass = computed(
  () =>
    ({
      sm: { box: "h-4 w-4", icon: 10 },
      md: { box: "h-5 w-5", icon: 12 },
      lg: { box: "h-6 w-6", icon: 14 },
    })[props.size],
);
</script>
