<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <Sidebar
      :isOpen="sidebarOpen"
      :isCollapsed="isSidebarCollapsed"
      @close="sidebarOpen = false"
      @toggle-collapse="toggleSidebarCollapsed"
    />
    <TopBar :sidebar-collapsed="isSidebarCollapsed" @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <main class="main-content" :class="{ 'sidebar-open': sidebarOpen }">
      <router-view />
    </main>

    <!-- Overlay для мобильных устройств -->
    <div v-if="sidebarOpen && isMobile" class="sidebar-overlay" @click="sidebarOpen = false"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import Sidebar from "./Sidebar.vue";
import TopBar from "./TopBar.vue";
import { useThemeStore } from "../../stores/theme";

const sidebarOpen = ref(true);
const isMobile = ref(false);
const themeStore = useThemeStore();
const isSidebarCollapsed = computed(() => themeStore.sidebarCollapsed);

const toggleSidebarCollapsed = () => {
  themeStore.toggleSidebarCollapsed();
};

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
  background: linear-gradient(145deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.main-content {
  margin-left: 264px;
  margin-top: 72px;
  padding: 32px;
  transition: margin-left 0.3s ease;
  min-height: calc(100vh - 72px);
}

.app-shell.sidebar-collapsed .main-content {
  margin-left: 96px;
}

.main-content :deep(> *) {
  max-width: 1280px;
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
    padding: 24px 12px;
  }

  .app-shell.sidebar-collapsed .main-content {
    margin-left: 0;
  }
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #00000073;
  z-index: 30;
  backdrop-filter: blur(6px);
}
</style>
