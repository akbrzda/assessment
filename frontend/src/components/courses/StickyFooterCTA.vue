<template>
  <div class="sticky-footer-cta" :class="{ hidden: hidden }">
    <button class="btn btn-primary btn-full" type="button" :disabled="disabled" @click="$emit('action')">
      {{ label }}
    </button>
  </div>
</template>

<script>
export default {
  name: "StickyFooterCTA",
  emits: ["action"],
  props: {
    label: {
      type: String,
      default: "Продолжить",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.sticky-footer-cta {
  position: sticky;
  bottom: 0;
  z-index: 20;
  margin-top: 12px;
  padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 35%, rgba(255, 255, 255, 1) 100%);
}

.hidden {
  display: none;
}
</style>
