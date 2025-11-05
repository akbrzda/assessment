<template>
  <UiModal v-bind="$attrs">
    <template v-if="$slots.header" #header>
      <slot name="header"></slot>
    </template>
    <slot></slot>
    <template v-if="$slots.footer" #footer>
      <slot name="footer"></slot>
    </template>
  </UiModal>
</template>

<script setup>
import UiModal from './UiModal.vue';
</script>
