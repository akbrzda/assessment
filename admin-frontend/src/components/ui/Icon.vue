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
    default: undefined,
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
  tone: {
    type: String,
    default: "default",
    validator: (value) => ["default", "muted", "primary", "success", "warning", "danger", "disabled"].includes(value),
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
  if (props.strokeWidth !== undefined && props.strokeWidth !== null && props.strokeWidth !== "") {
    const value = Number(props.strokeWidth);
    return Number.isFinite(value) && value > 0 ? value : 2;
  }
  return numericSize.value <= 16 ? 1.9 : 2.1;
});

const ariaHidden = computed(() => (props.ariaLabel ? "false" : "true"));

const forwardedAttrs = computed(() => {
  const { size, strokeWidth, color, absoluteStrokeWidth, ariaLabel, tone, ...rest } = attrs;
  return {
    ...rest,
    "aria-label": props.ariaLabel || rest["aria-label"] || undefined,
  };
});

const toneColorMap = {
  default: "currentColor",
  muted: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  success: "hsl(var(--accent-green))",
  warning: "hsl(var(--accent-orange))",
  danger: "hsl(var(--destructive))",
  disabled: "hsl(var(--muted-foreground) / 0.55)",
};

const color = computed(() => {
  if (props.color !== "currentColor") {
    return props.color;
  }
  return toneColorMap[props.tone] || "currentColor";
});
</script>
