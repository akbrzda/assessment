<template>
  <th
    :class="[
      'h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/95',
      right && 'text-right',
      center && 'text-center',
      sticky && 'sticky left-0 z-[6] bg-[hsl(var(--table-header-bg))]',
    ]"
  >
    <slot />
  </th>
</template>

<script setup>
defineProps({
  right: Boolean,
  center: Boolean,
  sticky: Boolean,
});
</script>
