<template>
  <div class="space-y-4">
    <div v-for="field in fields" :key="field" class="space-y-2">
      <Skeleton class="h-3 w-28" />
      <Skeleton class="h-10 w-full rounded-xl" />
    </div>
    <div class="flex justify-end gap-2 pt-2">
      <SkeletonButton width-class="w-24" />
      <SkeletonButton width-class="w-32" />
    </div>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";
import SkeletonButton from "./SkeletonButton.vue";

defineProps({
  fields: { type: Number, default: 6 },
});
</script>
