<template>
  <tr
    :class="[
      'group border-b border-border/80 transition-all duration-[var(--motion-fast)]',
      'focus-within:bg-[hsl(var(--table-row-hover))]',
      selected && 'bg-[hsl(var(--table-row-selected))] ring-1 ring-inset ring-primary/30',
      clickable && 'cursor-pointer hover:bg-[hsl(var(--table-row-hover))] hover:shadow-[inset_3px_0_0_0_hsl(var(--sidebar-active-indicator))]',
    ]"
  >
    <slot />
  </tr>
</template>

<script setup>
defineProps({
  clickable: Boolean,
  selected: Boolean,
});
</script>
