<template>
  <td
    :class="[
      'px-4 py-3.5 align-middle text-sm text-foreground transition-colors duration-[var(--motion-fast)]',
      emphasized ? 'font-semibold text-foreground' : '',
      right && 'text-right',
      center && 'text-center',
      muted && 'text-muted-foreground',
      sticky && 'sticky left-0 z-[4] bg-card',
    ]"
  >
    <slot />
  </td>
</template>

<script setup>
defineProps({
  right: Boolean,
  center: Boolean,
  muted: Boolean,
  emphasized: Boolean,
  sticky: Boolean,
});
</script>
