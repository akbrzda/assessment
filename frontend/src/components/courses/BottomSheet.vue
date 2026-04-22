<template>
  <teleport to="body">
    <div v-if="modelValue" class="sheet-overlay" @click="close">
      <div class="sheet" role="dialog" aria-modal="true" @click.stop>
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3 class="sheet-title">{{ title }}</h3>
          <button class="sheet-close" type="button" @click="close">Закрыть</button>
        </div>
        <div class="sheet-body">
          <slot>
            <p class="sheet-text">{{ description }}</p>
          </slot>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
export default {
  name: "BottomSheet",
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "Детали",
    },
    description: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    function close() {
      if (!props.modelValue) {
        return;
      }
      emit("update:modelValue", false);
    }

    return {
      close,
    };
  },
};
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  border-radius: 16px 16px 0 0;
  background: var(--bg-primary, #ffffff);
  padding: 10px 16px 20px;
  box-shadow: 0 -12px 28px rgba(15, 23, 42, 0.2);
}

.sheet-handle {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.36);
  margin: 0 auto 12px;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.sheet-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.sheet-close {
  border: none;
  background: transparent;
  color: var(--text-secondary, #64748b);
  font-size: 13px;
}

.sheet-body {
  margin-top: 10px;
}

.sheet-text {
  margin: 0;
  color: var(--text-secondary, #64748b);
}
</style>
