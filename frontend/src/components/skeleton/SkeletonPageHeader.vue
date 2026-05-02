<template>
  <div class="sk-header">
    <SkeletonBlock class="sk-header__title" />
    <SkeletonBlock class="sk-header__subtitle" />
  </div>
</template>

<script>
import SkeletonBlock from "./SkeletonBlock.vue";

export default {
  name: "SkeletonPageHeader",
  components: { SkeletonBlock },
};
</script>

<style scoped>
.sk-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.sk-header__title {
  height: 26px;
  width: 62%;
}

.sk-header__subtitle {
  height: 14px;
  width: 78%;
}
</style>
