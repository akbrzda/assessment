<template>
  <component
    :is="resolvedIcon"
    v-bind="forwardedAttrs"
    :size="numericSize"
    :stroke-width="numericStrokeWidth"
    :color="color"
    :absolute-stroke-width="absoluteStrokeWidth"
    role="img"
    :aria-hidden="ariaHidden"
  />
</template>

<script setup>
import { computed, useAttrs } from "vue";
import * as lucideIcons from "lucide-vue-next";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 24,
  },
  strokeWidth: {
    type: [Number, String],
    default: 2,
  },
  color: {
    type: String,
    default: "currentColor",
  },
  absoluteStrokeWidth: {
    type: Boolean,
    default: false,
  },
  ariaLabel: {
    type: String,
    default: "",
  },
});

const attrs = useAttrs();

const fallbackIcon = lucideIcons.HelpCircle;

const normalizeName = (value) => {
  if (!value) {
    return "";
  }

  const cleaned = value
    .replace(/[-_\s]+(.)?/g, (_, group) => (group ? group.toUpperCase() : ""))
    .replace(/^\w/, (match) => match.toUpperCase());

  return cleaned.endsWith("Icon") ? cleaned : `${cleaned}Icon`;
};

const resolvedIcon = computed(() => {
  const normalized = normalizeName(props.name);

  if (!normalized) {
    return fallbackIcon;
  }

  const icon = lucideIcons[normalized] || lucideIcons[normalized.replace(/Icon$/, "")];

  if (!icon) {
    if (import.meta.env.DEV) {
      console.warn(`[Icon] Иконка "${props.name}" не найдена в lucide-vue-next.`);
    }
    return fallbackIcon;
  }

  return icon;
});

const numericSize = computed(() => {
  const value = Number(props.size);
  return Number.isFinite(value) && value > 0 ? value : 24;
});

const numericStrokeWidth = computed(() => {
  const value = Number(props.strokeWidth);
  return Number.isFinite(value) && value > 0 ? value : 2;
});

const ariaHidden = computed(() => (props.ariaLabel ? "false" : "true"));

const forwardedAttrs = computed(() => {
  const { size, strokeWidth, color, absoluteStrokeWidth, ariaLabel, ...rest } = attrs;
  return {
    ...rest,
    "aria-label": props.ariaLabel || rest["aria-label"] || undefined,
  };
});
</script>
