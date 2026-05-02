<template>
  <article class="sk-card">
    <div class="sk-card__row">
      <SkeletonBlock class="sk-card__icon" />
      <div class="sk-card__body">
        <SkeletonBlock class="sk-card__title" />
        <SkeletonBlock class="sk-card__meta" />
      </div>
    </div>
    <SkeletonBlock class="sk-card__cta" />
  </article>
</template>

<script>
import SkeletonBlock from "./SkeletonBlock.vue";

export default {
  name: "SkeletonCard",
  components: { SkeletonBlock },
};
</script>

<style scoped>
.sk-card {
  border: 1px solid var(--divider);
  border-radius: 14px;
  padding: 14px;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sk-card__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sk-card__icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex-shrink: 0;
}

.sk-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-card__title {
  height: 14px;
  width: 56%;
}

.sk-card__meta {
  height: 12px;
  width: 80%;
}

.sk-card__cta {
  height: 40px;
  width: 38%;
  border-radius: 10px;
}
</style>
