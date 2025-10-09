<template>
  <svg :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
</template>

<script>
export default {
  name: "ChevronLeftIcon",
  props: {
    iconClass: {
      type: String,
      default: "w-6 h-6",
    },
  },
};
</script>
