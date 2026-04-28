<template>
  <div class="app-root">
    <router-view />
    <Toaster rich-colors close-button position="top-right" />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { Toaster } from "vue-sonner";
import { useThemeStore } from "./stores/theme";

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.init();
});
</script>

<style scoped>
.app-root {
  min-height: 100vh;
}
</style>