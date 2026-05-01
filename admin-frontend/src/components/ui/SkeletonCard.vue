<template>
  <div class="rounded-xl border border-border bg-card p-4 space-y-4">
    <div class="space-y-2">
      <Skeleton class="h-5 w-48" />
      <SkeletonText :lines="2" />
    </div>
    <slot>
      <Skeleton class="h-28 w-full rounded-lg" />
    </slot>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";
import SkeletonText from "./SkeletonText.vue";
</script>
