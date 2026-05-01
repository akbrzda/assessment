<template>
  <div :class="cn('skeleton-shimmer rounded-lg', $props.class)" :style="style" aria-hidden="true" />
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps({
  class: {
    type: String,
    default: "",
  },
  // Явные размеры через пропсы (альтернатива классам)
  width: String,
  height: String,
});

const style = computed(() => {
  const s = {};
  if (props.width) s.width = props.width;
  if (props.height) s.height = props.height;
  return s;
});
</script>
