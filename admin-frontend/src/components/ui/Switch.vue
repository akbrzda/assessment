<template>
  <label :class="['inline-flex items-center gap-2.5', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']">
    <SwitchRoot
      :checked="modelValue"
      :disabled="disabled"
      :class="[
        'relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        sizeClass.track,
      ]"
      @update:checked="emit('update:modelValue', $event)"
    >
      <SwitchThumb
        :class="[
          'pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          sizeClass.thumb,
          modelValue ? sizeClass.translateOn : 'translate-x-0',
        ]"
      />
    </SwitchRoot>
    <span v-if="label" class="text-sm font-medium text-foreground select-none leading-none">{{ label }}</span>
    <span v-if="description" class="text-xs text-muted-foreground select-none">{{ description }}</span>
  </label>
</template>

<script setup>
import { computed } from "vue";
import { SwitchRoot, SwitchThumb } from "reka-ui";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  label: String,
  description: String,
  disabled: Boolean,
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
      sm: { track: "h-4 w-7", thumb: "h-3 w-3", translateOn: "translate-x-3" },
      md: { track: "h-5 w-9", thumb: "h-4 w-4", translateOn: "translate-x-4" },
      lg: { track: "h-6 w-11", thumb: "h-5 w-5", translateOn: "translate-x-5" },
    })[props.size],
);
</script>
