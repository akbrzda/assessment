<template>
  <th
    :class="[
      'h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground',
      right && 'text-right',
      center && 'text-center',
    ]"
  >
    <slot />
  </th>
</template>

<script setup>
defineProps({
  right: Boolean,
  center: Boolean,
});
</script>
