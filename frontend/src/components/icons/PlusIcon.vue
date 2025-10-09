<template>
  <svg :class="iconClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
  </svg>
</template>

<script>
export default {
  name: "PlusIcon",
  props: {
    iconClass: {
      type: String,
      default: "w-6 h-6",
    },
  },
};
</script>
