<template>
  <Teleport to="body">
    <Transition name="ui-modal-fade">
      <div v-if="modelValue" class="ui-modal-overlay" @click="handleOverlayClick">
        <Transition name="ui-modal-slide">
          <div v-if="modelValue" class="ui-modal-container" :class="modalSizeClass" @click.stop>
            <!-- Header -->
            <div v-if="title || $slots.header" class="ui-modal-header">
              <slot name="header">
                <h3 class="ui-modal-title">{{ title }}</h3>
              </slot>
              <button v-if="closable" class="ui-modal-close" @click="handleClose" aria-label="Закрыть">✕</button>
            </div>

            <!-- Body -->
            <div class="ui-modal-body" :class="{ 'ui-modal-body-no-padding': noPadding }">
              <slot></slot>
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="ui-modal-footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch } from "vue";

const props = defineProps({
  modelValue: Boolean,
  title: String,
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg", "xl", "full"].includes(value),
  },
  closable: {
    type: Boolean,
    default: true,
  },
  closeOnOverlay: {
    type: Boolean,
    default: true,
  },
  noPadding: Boolean,
});

const emit = defineEmits(["update:modelValue", "close"]);

const modalSizeClass = computed(() => {
  return `ui-modal-${props.size}`;
});

const handleClose = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose();
  }
};

// Блокировка скролла при открытии модалки
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
);
</script>

<style scoped>
.ui-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.ui-modal-container {
  background-color: var(--surface-card);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Sizes */
.ui-modal-sm {
  width: 100%;
  max-width: 400px;
}

.ui-modal-md {
  width: 100%;
  max-width: 600px;
}

.ui-modal-lg {
  width: 100%;
  max-width: 800px;
}

.ui-modal-xl {
  width: 100%;
  max-width: 1200px;
}

.ui-modal-full {
  width: 95%;
  max-width: 95vw;
  max-height: 95vh;
}

.ui-modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.ui-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.ui-modal-close {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.ui-modal-close:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.ui-modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.ui-modal-body-no-padding {
  padding: 0;
}

.ui-modal-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--divider);
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
}

/* Transitions */
.ui-modal-fade-enter-active,
.ui-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.ui-modal-fade-enter-from,
.ui-modal-fade-leave-to {
  opacity: 0;
}

.ui-modal-slide-enter-active,
.ui-modal-slide-leave-active {
  transition: all 0.2s ease;
}

.ui-modal-slide-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

.ui-modal-slide-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .ui-modal-overlay {
    padding: 0;
  }

  .ui-modal-container {
    border-radius: 0;
    max-height: 100vh;
  }

  .ui-modal-sm,
  .ui-modal-md,
  .ui-modal-lg,
  .ui-modal-xl {
    width: 100%;
    max-width: 100%;
  }

  .ui-modal-header,
  .ui-modal-body {
    padding: 1rem;
  }

  .ui-modal-footer {
    padding: 0.75rem 1rem;
  }
}
</style>
