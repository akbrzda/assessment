<template>
  <teleport to="body">
    <transition name="popup-fade">
      <div v-if="modelValue" class="popup-overlay" @click.self="close">
        <div class="popup-card" role="dialog" aria-modal="true">
          <button class="popup-close" type="button" @click="close" aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>

          <div class="popup-icon-wrap">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#5B4FCF" stroke-width="1.8" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#5B4FCF" stroke-width="1.8" stroke-linecap="round" />
              <circle cx="12" cy="16" r="1.2" fill="#5B4FCF" />
            </svg>
          </div>

          <h3 class="popup-title">{{ title }}</h3>
          <p class="popup-description">{{ description }}</p>

          <button class="popup-btn" type="button" @click="close">Понятно</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
export default {
  name: "LockPopup",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "Недоступно",
    },
    description: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    function close() {
      emit("update:modelValue", false);
    }
    return { close };
  },
};
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
}

.popup-card {
  position: relative;
  background: var(--bg-primary);
  border-radius: 24px;
  padding: 28px 24px 24px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
}

.popup-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  transition: background 0.15s;
}

.popup-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.popup-icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.popup-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px;
  line-height: 1.3;
}

.popup-description {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 24px;
  line-height: 1.5;
}

.popup-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: var(--accent);
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.popup-btn:hover {
  opacity: 0.9;
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.2s;
}

.popup-fade-enter-active .popup-card,
.popup-fade-leave-active .popup-card {
  transition: transform 0.2s;
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

.popup-fade-enter-from .popup-card {
  transform: scale(0.96);
}
</style>
