<template>
  <svg :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
</template>

<script>
export default {
  name: "TrendDownIcon",
  props: {
    iconClass: {
      type: String,
      default: "w-6 h-6",
    },
  },
};
</script>
