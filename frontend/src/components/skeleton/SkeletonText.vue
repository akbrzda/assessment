<template>
  <div class="sk-text">
    <SkeletonBlock v-for="line in lines" :key="line" class="sk-text__line" :class="{ 'sk-text__line--short': line === lines }" />
  </div>
</template>

<script>
import SkeletonBlock from "./SkeletonBlock.vue";

export default {
  name: "SkeletonText",
  components: { SkeletonBlock },
  props: {
    lines: {
      type: Number,
      default: 2,
    },
  },
};
</script>

<style scoped>
.sk-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-text__line {
  height: 12px;
  width: 100%;
}

.sk-text__line--short {
  width: 72%;
}
</style>
