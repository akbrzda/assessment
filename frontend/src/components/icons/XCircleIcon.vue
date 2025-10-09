<template>
  <svg :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
</template>

<script>
export default {
  name: "XCircleIcon",
  props: {
    iconClass: {
      type: String,
      default: "w-6 h-6",
    },
  },
};
</script>
