<template>
  <div class="sk-list">
    <div v-for="index in items" :key="index" class="sk-list__item">
      <SkeletonBlock class="sk-list__dot" />
      <div class="sk-list__text">
        <SkeletonBlock class="sk-list__line" />
        <SkeletonBlock class="sk-list__line sk-list__line--short" />
      </div>
    </div>
  </div>
</template>

<script>
import SkeletonBlock from "./SkeletonBlock.vue";

export default {
  name: "SkeletonList",
  components: { SkeletonBlock },
  props: {
    items: {
      type: Number,
      default: 4,
    },
  },
};
</script>

<style scoped>
.sk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-list__item {
  border: 1px solid var(--divider);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.sk-list__dot {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  flex-shrink: 0;
}

.sk-list__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sk-list__line {
  height: 11px;
  width: 88%;
}

.sk-list__line--short {
  width: 52%;
}
</style>
