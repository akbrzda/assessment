<template>
  <td :class="['px-4 py-3 align-middle text-sm text-foreground', right && 'text-right', center && 'text-center', muted && 'text-muted-foreground']">
    <slot />
  </td>
</template>

<script setup>
defineProps({
  right: Boolean,
  center: Boolean,
  muted: Boolean,
});
</script>
