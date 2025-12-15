<template>
  <div class="app-root">
    <router-view />
    <div class="toast-container" v-if="toasts.length">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast-${toast.type}`">
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click="removeToast(toast.id)" aria-label="Закрыть уведомление">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useThemeStore } from "./stores/theme";
import { useToast } from "./composables/useToast";

const themeStore = useThemeStore();
const { toasts, removeToast } = useToast();

onMounted(() => {
  themeStore.init();
});
</script>

<style scoped>
.app-root {
  min-height: 100vh;
}

.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
}

.toast {
  min-width: 280px;
  max-width: 360px;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 12px 30px #0000001a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-primary);
  background: var(--surface-card);
  border: 1px solid var(--divider);
}

.toast-success {
  border-color: var(--accent-green);
}

.toast-error {
  border-color: #ef4444;
}

.toast-warning {
  border-color: var(--accent-orange);
}

.toast-info {
  border-color: var(--accent-blue);
}

.toast-message {
  flex: 1;
  font-size: 14px;
}

.toast-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
}
</style>
