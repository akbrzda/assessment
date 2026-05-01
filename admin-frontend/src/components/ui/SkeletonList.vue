<template>
  <div class="space-y-3">
    <div v-for="item in items" :key="item" class="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <SkeletonAvatar size-class="h-9 w-9" />
      <div class="min-w-0 flex-1 space-y-2">
        <Skeleton class="h-3 w-1/3" />
        <Skeleton class="h-3 w-2/3" />
      </div>
      <Skeleton class="h-7 w-16 rounded-full" />
    </div>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";
import SkeletonAvatar from "./SkeletonAvatar.vue";

defineProps({
  items: { type: Number, default: 5 },
});
</script>
