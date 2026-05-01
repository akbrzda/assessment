<template>
  <div class="mb-6 space-y-3">
    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div class="space-y-2">
        <Skeleton class="h-7 w-52" />
        <Skeleton class="h-4 w-72 max-w-full" />
      </div>
      <div class="flex flex-wrap gap-2">
        <SkeletonButton width-class="w-28" />
        <SkeletonButton width-class="w-36" />
      </div>
    </div>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";
import SkeletonButton from "./SkeletonButton.vue";
</script>
