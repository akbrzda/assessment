<template>
  <div v-if="authStore.isAuthenticated" class="min-h-screen bg-background text-foreground">
    <div class="flex min-h-screen overflow-x-clip">
      <!-- Сайдбар: постоянный на desktop -->
      <Sidebar v-if="!isMobile" class="flex" :is-open="true" :is-collapsed="isSidebarCollapsed" @navigate="() => {}" />

      <!-- Основной контент -->
      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar :sidebar-collapsed="isSidebarCollapsed" @toggle-sidebar="handleToggleSidebar" />
        <main class="mx-auto flex-1 min-w-0 w-full max-w-[1680px] px-3 pb-6 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pb-8 lg:pt-5">
          <router-view />
        </main>
      </div>
    </div>

    <!-- Overlay на мобильных -->
    <Transition name="fade">
      <div v-if="isMobile && mobileMenuOpen" class="fixed inset-0 z-40 bg-black/40" @click="mobileMenuOpen = false" />
    </Transition>

    <!-- Сайдбар: slide-in на мобильных -->
    <Transition name="slide">
      <Sidebar
        v-if="isMobile && mobileMenuOpen"
        class="lg:hidden"
        :is-open="mobileMenuOpen"
        :is-collapsed="false"
        @close="mobileMenuOpen = false"
        @navigate="mobileMenuOpen = false"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import Sidebar from "./Sidebar.vue";
import TopBar from "./TopBar.vue";
import { useThemeStore } from "../../stores/theme";
import { useAuthStore } from "../../stores/auth";

const themeStore = useThemeStore();
const authStore = useAuthStore();
const isMobile = ref(false);
const mobileMenuOpen = ref(false);
const isSidebarCollapsed = computed(() => themeStore.sidebarCollapsed);

const handleToggleSidebar = () => {
  if (isMobile.value) {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  } else {
    themeStore.toggleSidebarCollapsed();
  }
};

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024;
  if (!isMobile.value) mobileMenuOpen.value = false;
};

onMounted(() => {
  updateIsMobile();
  window.addEventListener("resize", updateIsMobile);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateIsMobile);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
