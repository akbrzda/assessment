<template>
  <div
    :data-density="density"
    class="table-shell relative w-full overflow-x-auto overflow-y-visible rounded-[var(--radius-md)] border border-border/80 bg-card shadow-[var(--elevation-soft)]"
  >
    <table class="w-full caption-bottom text-sm">
      <slot />
    </table>
  </div>
</template>

<script setup>
defineProps({
  density: {
    type: String,
    default: "default",
    validator: (value) => ["compact", "default", "relaxed"].includes(value),
  },
});
</script>

<style scoped>
.table-shell :deep(thead) {
  position: sticky;
  top: 0;
  z-index: 5;
}

.table-shell :deep(tbody tr:nth-child(even)) {
  background-color: hsl(var(--table-row-stripe));
}

.table-shell[data-density="compact"] :deep(td) {
  padding-top: var(--density-table-row-compact);
  padding-bottom: var(--density-table-row-compact);
}

.table-shell[data-density="default"] :deep(td) {
  padding-top: var(--density-table-row-default);
  padding-bottom: var(--density-table-row-default);
}

.table-shell[data-density="relaxed"] :deep(td) {
  padding-top: var(--density-table-row-relaxed);
  padding-bottom: var(--density-table-row-relaxed);
}
</style>
