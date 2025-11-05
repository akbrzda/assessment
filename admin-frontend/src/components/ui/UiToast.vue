<template>
  <Teleport to="body">
    <TransitionGroup name="ui-toast" tag="div" class="ui-toast-container">
      <div v-for="toast in toasts" :key="toast.id" :class="['ui-toast', `ui-toast-${toast.type}`]">
        <div class="ui-toast-icon">
          {{ getIcon(toast.type) }}
        </div>
        <div class="ui-toast-content">
          <p v-if="toast.title" class="ui-toast-title">{{ toast.title }}</p>
          <p class="ui-toast-message">{{ toast.message }}</p>
        </div>
        <button class="ui-toast-close" @click="removeToast(toast.id)">✕</button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref } from "vue";

const toasts = ref([]);
let toastId = 0;

const getIcon = (type) => {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };
  return icons[type] || "ℹ";
};

const addToast = (toast) => {
  const id = toastId++;
  const newToast = {
    id,
    type: toast.type || "info",
    title: toast.title || "",
    message: toast.message || "",
    duration: toast.duration || 3000,
  };

  toasts.value.push(newToast);

  if (newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }

  return id;
};

const removeToast = (id) => {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
};

defineExpose({
  addToast,
  removeToast,
});
</script>

<style scoped>
.ui-toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
}

.ui-toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--surface-card);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--divider);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
}

.ui-toast-icon {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
}

.ui-toast-success .ui-toast-icon {
  background-color: var(--accent-green-soft);
  color: var(--accent-green);
}

.ui-toast-error .ui-toast-icon {
  background-color: var(--accent-red-soft);
  color: var(--accent-red);
}

.ui-toast-warning .ui-toast-icon {
  background-color: var(--accent-orange-soft);
  color: var(--accent-orange);
}

.ui-toast-info .ui-toast-icon {
  background-color: var(--accent-blue-soft);
  color: var(--accent-blue);
}

.ui-toast-content {
  flex: 1;
  min-width: 0;
}

.ui-toast-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.ui-toast-message {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
  word-wrap: break-word;
}

.ui-toast-close {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.ui-toast-close:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

/* Transitions */
.ui-toast-enter-active,
.ui-toast-leave-active {
  transition: all 0.3s ease;
}

.ui-toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.ui-toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

@media (max-width: 640px) {
  .ui-toast-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }

  .ui-toast {
    min-width: auto;
    max-width: 100%;
  }
}
</style>
