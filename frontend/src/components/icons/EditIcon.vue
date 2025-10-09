<template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-label="Edit"
  >
    <path
      d="M14.5 6.5L17.5 9.5
           M5.5 18.5l3.9-1.03a2 2 0 0 0 .86-.5l8.24-8.24a2.1 2.1 0 0 0 0-2.97l-.35-.35a2.1 2.1 0 0 0-2.97 0L6.94 13.65a2 2 0 0 0-.5.86L5.5 18.5Z"
    />
  </svg>
</template>

<script>
export default {
  name: "EditIcon",
};
</script>

<style scoped>
svg {
  transition: all 0.2s ease;
}

svg:hover {
  transform: scale(1.1);
}
</style>
