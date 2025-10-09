<template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-label="Close"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
</template>

<script>
export default {
  name: "CloseIcon",
};
</script>

<style scoped>
svg {
  transition: all 0.2s ease;
}

svg:hover {
  transform: scale(1.1);
}

svg:hover circle {
  fill-opacity: 0.2;
}
</style>
