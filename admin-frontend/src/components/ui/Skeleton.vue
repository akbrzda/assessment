<template>
  <div :class="cn('animate-pulse rounded-lg bg-muted', $props.class)" />
</template>

<script setup>
import { cn } from "@/lib/utils";

defineProps({
  class: {
    type: String,
    default: "",
  },
});
</script>
