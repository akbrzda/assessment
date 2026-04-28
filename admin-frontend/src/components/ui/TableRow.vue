<template>
  <tr :class="['border-b border-border transition-colors', clickable && 'cursor-pointer hover:bg-accent/50']">
    <slot />
  </tr>
</template>

<script setup>
defineProps({
  clickable: Boolean,
});
</script>
