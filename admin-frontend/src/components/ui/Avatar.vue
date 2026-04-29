<template>
  <div class="relative inline-flex shrink-0" :style="{ width: sizePx, height: sizePx }">
    <div
      :class="['flex items-center justify-center rounded-full overflow-hidden font-semibold select-none', !src && colorClass]"
      :style="{ width: sizePx, height: sizePx, fontSize: fontSizePx }"
    >
      <img v-if="src" :src="src" :alt="alt || name" class="w-full h-full object-cover rounded-full" @error="onImgError" />
      <span v-else>{{ initials }}</span>
    </div>

    <span
      v-if="status"
      :class="['absolute bottom-0 right-0 rounded-full border-2 border-background', statusClass]"
      :style="{ width: dotSizePx, height: dotSizePx }"
    />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  name: {
    type: String,
    default: "",
  },
  src: {
    type: String,
    default: "",
  },
  alt: String,
  size: {
    type: [String, Number],
    default: "md",
    validator: (v) => ["xs", "sm", "md", "lg", "xl"].includes(v) || typeof v === "number",
  },
  status: {
    type: String,
    default: null,
    validator: (v) => ["online", "offline", "busy", "away"].includes(v),
  },
  color: {
    type: String,
    default: null,
  },
});

const imgFailed = ref(false);

const onImgError = () => {
  imgFailed.value = true;
};

const sizePxMap = { xs: "24px", sm: "32px", md: "40px", lg: "48px", xl: "64px" };
const fontSizeMap = { xs: "10px", sm: "12px", md: "14px", lg: "16px", xl: "22px" };
const dotSizeMap = { xs: "7px", sm: "9px", md: "11px", lg: "13px", xl: "16px" };

const sizePx = computed(() => {
  if (typeof props.size === "number") return `${props.size}px`;
  return sizePxMap[props.size] ?? "40px";
});

const fontSizePx = computed(() => {
  if (typeof props.size === "number") return `${Math.round(props.size * 0.35)}px`;
  return fontSizeMap[props.size] ?? "14px";
});

const dotSizePx = computed(() => {
  if (typeof props.size === "number") return `${Math.round(props.size * 0.27)}px`;
  return dotSizeMap[props.size] ?? "11px";
});

// Цвета аватаров по инициалам
const PALETTE = [
  "bg-accent-blue text-white",
  "bg-accent-green text-white",
  "bg-accent-orange text-white",
  "bg-accent-purple text-white",
  "bg-destructive text-destructive-foreground",
  "bg-primary text-primary-foreground",
];

const colorClass = computed(() => {
  if (props.color) return props.color;
  const code = (props.name || "?").charCodeAt(0);
  return PALETTE[code % PALETTE.length];
});

const initials = computed(() => {
  const parts = (props.name || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0][0] || "?").toUpperCase();
});

const statusClass = computed(
  () =>
    ({
      online: "bg-accent-green",
      offline: "bg-muted-foreground",
      busy: "bg-destructive",
      away: "bg-accent-orange",
    })[props.status],
);
</script>
