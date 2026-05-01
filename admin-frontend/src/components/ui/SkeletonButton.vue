<template>
  <Skeleton :class="`h-9 ${widthClass} rounded-xl`" />
</template>

<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  widthClass: { type: String, default: "w-28" },
});
</script>
