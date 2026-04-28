<template>
  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-[28px] font-bold text-foreground m-0">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-muted-foreground mt-1 m-0">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-3 flex-wrap">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
});
</script>
