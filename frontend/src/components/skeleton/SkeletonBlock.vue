<template>
  <div class="sk-block" :class="$attrs.class" aria-hidden="true"></div>
</template>

<script>
export default {
  name: "SkeletonBlock",
};
</script>

<style scoped>
.sk-block {
  position: relative;
  overflow: hidden;
  border-radius: var(--skeleton-radius);
  background: var(--skeleton-bg);
}

.sk-block::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--skeleton-highlight), transparent);
  animation: skeleton-shimmer var(--skeleton-duration) infinite;
}
</style>
