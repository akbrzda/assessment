<template>
  <teleport to="body">
    <transition name="popup-fade">
      <div v-if="modelValue" class="popup-overlay" @click.self="close" @keydown.esc="close">
        <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="lock-popup-title">
          <button class="popup-close" type="button" @click="close" aria-label="Закрыть">
            <X :size="34" :stroke-width="1.8" />
          </button>

          <div class="popup-icon-wrap">
            <LockKeyhole :size="60" :stroke-width="1.9" />
          </div>

          <h3 id="lock-popup-title" class="popup-title">{{ title }}</h3>
          <p class="popup-description">{{ description }}</p>

          <button class="popup-btn" type="button" @click="close">Понятно</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { onUnmounted, watch } from "vue";
import { LockKeyhole, X } from "lucide-vue-next";

export default {
  name: "LockPopup",
  components: {
    LockKeyhole,
    X,
  },
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
    function setBodyScrollLocked(isLocked) {
      document.body.style.overflow = isLocked ? "hidden" : "";
    }

    watch(
      () => props.modelValue,
      (isVisible) => {
        setBodyScrollLocked(isVisible);
      },
      { immediate: true },
    );

    onUnmounted(() => {
      setBodyScrollLocked(false);
    });

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
  z-index: 2400;
  background: rgba(33, 38, 66, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.popup-card {
  position: relative;
  background: #ffffff;
  border-radius: 28px;
  padding: 56px 40px 38px;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.popup-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 46px;
  height: 46px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #7f8097;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.popup-close:hover {
  background: rgba(94, 78, 248, 0.08);
  color: #5856d6;
}

.popup-icon-wrap {
  width: 138px;
  height: 138px;
  border-radius: 50%;
  background: #efeefe;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5b4fcf;
  margin-bottom: 34px;
}

.popup-title {
  font-size: 56px;
  font-weight: 700;
  color: #141837;
  margin: 0 0 20px;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.popup-description {
  font-size: 42px;
  color: #6f7290;
  margin: 0 0 38px;
  line-height: 1.25;
  letter-spacing: -0.01em;
  max-width: 440px;
}

.popup-btn {
  width: 100%;
  min-height: 96px;
  padding: 20px 24px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(90deg, #5d5cfb 0%, #4f39f3 100%);
  color: #ffffff;
  font-size: 46px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition:
    transform 0.15s,
    opacity 0.15s;
}

.popup-btn:hover {
  opacity: 0.96;
  transform: translateY(-1px);
}

.popup-btn:active {
  transform: translateY(0);
}

.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: opacity 0.22s ease;
}

.popup-fade-enter-active .popup-card,
.popup-fade-leave-active .popup-card {
  transition: transform 0.22s ease;
}

.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
}

.popup-fade-enter-from .popup-card {
  transform: translateY(10px) scale(0.97);
}

@media (max-width: 768px) {
  .popup-overlay {
    padding: 16px;
  }

  .popup-card {
    max-width: 100%;
    border-radius: 20px;
    padding: 44px 20px 20px;
  }

  .popup-close {
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
  }

  .popup-icon-wrap {
    width: 92px;
    height: 92px;
    margin-bottom: 18px;
  }

  .popup-title {
    font-size: 40px;
    margin-bottom: 10px;
  }

  .popup-description {
    font-size: 24px;
    margin-bottom: 20px;
    max-width: 300px;
  }

  .popup-btn {
    min-height: 68px;
    border-radius: 14px;
    font-size: 34px;
  }
}

@media (max-width: 480px) {
  .popup-title {
    font-size: 20px;
  }

  .popup-description {
    font-size: 15px;
  }

  .popup-btn {
    min-height: 58px;
    font-size: 17px;
  }
}
</style>
