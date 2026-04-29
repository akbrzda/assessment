<template>
  <div class="flex flex-col gap-3">
    <div v-if="label" class="flex items-center justify-between">
      <span class="text-sm font-medium text-foreground">{{ label }}</span>
      <span v-if="showValue" class="text-sm text-muted-foreground">
        {{ range ? `${modelValue[0]} – ${modelValue[1]}` : modelValue }}
      </span>
    </div>

    <SliderRoot
      :model-value="sliderValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="relative flex w-full touch-none select-none items-center"
      @update:model-value="onUpdate"
    >
      <SliderTrack class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderRange class="absolute h-full bg-primary" />
      </SliderTrack>

      <SliderThumb
        v-for="(_, i) in sliderValue"
        :key="i"
        :class="[
          'block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing',
        ]"
      >
        <div
          v-if="showTooltip"
          class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100"
        >
          {{ sliderValue[i] }}
        </div>
      </SliderThumb>
    </SliderRoot>

    <!-- Метки min/max -->
    <div v-if="showLabels" class="flex justify-between text-xs text-muted-foreground">
      <span>{{ min }}</span>
      <span>{{ max }}</span>
    </div>

    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from "reka-ui";

const props = defineProps({
  modelValue: {
    type: [Number, Array],
    default: 0,
  },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  range: Boolean,
  label: String,
  error: String,
  hint: String,
  disabled: Boolean,
  showValue: { type: Boolean, default: true },
  showLabels: { type: Boolean, default: true },
  showTooltip: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const sliderValue = computed(() => {
  if (props.range) {
    return Array.isArray(props.modelValue) ? props.modelValue : [props.min, props.max];
  }
  return [typeof props.modelValue === "number" ? props.modelValue : props.min];
});

const onUpdate = (val) => {
  emit("update:modelValue", props.range ? val : val[0]);
};
</script>
