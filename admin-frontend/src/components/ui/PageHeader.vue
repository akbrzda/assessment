<template>
  <div class="space-y-3 mb-6">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <h1 class="text-lg font-semibold text-foreground m-0">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-muted-foreground m-0">{{ subtitle }}</p>
        <slot name="subtitle" />
      </div>
      <div v-if="$slots.actions" class="flex w-full flex-wrap items-center gap-2 md:w-auto">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.filters" class="rounded-xl border border-border bg-card p-2.5">
      <div class="grid gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-2.5 [&>*]:w-full sm:[&>*]:w-auto">
        <slot name="filters" />
      </div>
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
