<template>
  <div :class="cn('grid gap-4', gridClass)">
    <div v-for="i in count" :key="i" class="bg-background rounded-xl border border-border p-4 space-y-3">
      <Skeleton class="h-4 w-2/3" />
      <Skeleton class="h-8 w-1/2" />
      <Skeleton class="h-3 w-full" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { cn } from "@/lib/utils";
import Skeleton from "./Skeleton.vue";

const props = defineProps({
  count: {
    type: Number,
    default: 4,
  },
  cols: {
    type: Number,
    default: 4,
  },
});

const colsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};
const gridClass = computed(() => colsMap[props.cols] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
</script>
