<template>
  <UiProgressBar :value="value" />
</template>

<script>
import UiProgressBar from "../ui/ProgressBar.vue";

export default {
  name: "ProgressBar",
  components: { UiProgressBar },
  props: {
    value: {
      type: Number,
      default: 0,
    },
  },
};
</script>
