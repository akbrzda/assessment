<template>
  <div class="space-y-3">
    <Skeleton class="h-10 w-full" />
    <Skeleton v-for="i in rows" :key="i" class="h-12 w-full" />
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  rows: {
    type: Number,
    default: 5,
  },
});
</script>
