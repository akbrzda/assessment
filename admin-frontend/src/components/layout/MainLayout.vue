<template>
  <div class="app-shell">
    <Sidebar :isOpen="sidebarOpen" @close="sidebarOpen = false" />
    <TopBar @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <main class="main-content" :class="{ 'sidebar-open': sidebarOpen }">
      <router-view />
    </main>

    <!-- Overlay для мобильных устройств -->
    <div v-if="sidebarOpen && isMobile" class="sidebar-overlay" @click="sidebarOpen = false"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import Sidebar from "./Sidebar.vue";
import TopBar from "./TopBar.vue";

const sidebarOpen = ref(true);
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024;
  if (isMobile.value) {
    sidebarOpen.value = false;
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg-primary);
}

.main-content {
  margin-left: 260px;
  margin-top: 64px;
  padding: 2rem;
  transition: margin-left 0.3s ease;
  min-height: calc(100vh - 64px);
}

.main-content :deep(> *) {
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 1279px) {
  .main-content :deep(> *) {
    max-width: 100%;
  }
}

@media (max-width: 1023px) {
  .main-content {
    margin-left: 0;
    padding: 1.5rem 1.25rem 5rem;
  }
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 30;
}
</style>
