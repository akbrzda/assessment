<template>
  <div class="rounded-xl border border-border bg-card p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-2 flex-1">
        <Skeleton class="h-3 w-24" />
        <Skeleton class="h-8 w-20" />
        <Skeleton class="h-3 w-28" />
      </div>
      <Skeleton class="h-10 w-10 rounded-xl" />
    </div>
  </div>
</template>

<script setup>
import Skeleton from "./Skeleton.vue";
</script>
