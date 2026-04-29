<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-foreground leading-none">{{ label }}</label>

    <div class="inline-flex items-center gap-0.5" @mouseleave="hovered = 0">
      <button
        v-for="star in max"
        :key="star"
        type="button"
        :disabled="disabled || readonly"
        :class="[
          'p-0.5 bg-transparent border-none cursor-pointer transition-transform duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
          (disabled || readonly) && 'cursor-default',
          !disabled && !readonly && 'hover:scale-110',
        ]"
        @click="onClick(star)"
        @mouseenter="!disabled && !readonly && (hovered = star)"
      >
        <Icon
          :name="star <= activeValue ? 'Star' : 'Star'"
          :size="sizeMap[size]"
          :class="[
            'transition-colors duration-100',
            star <= activeValue ? 'text-accent-orange fill-accent-orange' : 'text-muted-foreground fill-transparent stroke-current',
          ]"
        />
      </button>
    </div>

    <p v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import Icon from "./Icon.vue";

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  max: { type: Number, default: 5 },
  label: String,
  hint: String,
  disabled: Boolean,
  readonly: Boolean,
  size: {
    type: String,
    default: "md",
    validator: (v) => ["sm", "md", "lg"].includes(v),
  },
});

const emit = defineEmits(["update:modelValue"]);

const hovered = ref(0);
const sizeMap = { sm: 16, md: 20, lg: 28 };

const activeValue = computed(() => hovered.value || props.modelValue);

const onClick = (star) => {
  if (props.disabled || props.readonly) return;
  emit("update:modelValue", star === props.modelValue ? 0 : star);
};
</script>
