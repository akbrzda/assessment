<template>
  <Skeleton :class="shapeClass" />
</template>

<script setup>
import { computed } from "vue";
import Skeleton from "./Skeleton.vue";

const props = defineProps({
  sizeClass: { type: String, default: "h-10 w-10" },
  rounded: { type: String, default: "full" },
});

const shapeClass = computed(() => `${props.sizeClass} ${props.rounded === "full" ? "rounded-full" : "rounded-lg"}`);
</script>
