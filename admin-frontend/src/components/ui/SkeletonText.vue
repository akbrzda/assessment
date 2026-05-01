<template>
  <div class="space-y-2">
    <Skeleton v-for="line in lines" :key="line" :class="lineClass(line)" />
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";

const props = defineProps({
  lines: { type: Number, default: 3 },
  lastWidthClass: { type: String, default: "w-3/4" },
});

const lineClass = (line) => {
  if (line === props.lines) {
    return `h-3 ${props.lastWidthClass}`;
  }
  return "h-3 w-full";
};
</script>
