<template>
  <div class="fullscreen-textarea-wrapper">
    <div class="textarea-header">
      <label v-if="label" class="textarea-label">
        {{ label }}
        <span v-if="required" class="required">*</span>
      </label>
      <Button size="sm" variant="ghost" icon="maximize-2" @click="openFullscreen"> На весь экран </Button>
    </div>
    <Textarea
      :modelValue="modelValue"
      @update:modelValue="$emit('update:modelValue', $event)"
      :rows="rows"
      :placeholder="placeholder"
      :required="required"
    />

    <Teleport to="body">
      <div v-if="isFullscreen" class="fullscreen-overlay" @click.self="closeFullscreen">
        <div class="fullscreen-content">
          <div class="fullscreen-header">
            <h3>{{ label }}</h3>
            <Button variant="ghost" icon="x" @click="closeFullscreen"> Закрыть </Button>
          </div>
          <textarea v-model="fullscreenValue" class="fullscreen-textarea" :placeholder="placeholder" @keydown.esc="closeFullscreen" />
          <div class="fullscreen-footer">
            <Button variant="secondary" @click="closeFullscreen"> Отмена </Button>
            <Button variant="primary" @click="saveFullscreen"> Сохранить </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Textarea from "./Textarea.vue";
import Button from "./Button.vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  rows: {
    type: Number,
    default: 5,
  },
  placeholder: {
    type: String,
    default: "",
  },
  required: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const isFullscreen = ref(false);
const fullscreenValue = ref("");

const openFullscreen = () => {
  fullscreenValue.value = props.modelValue;
  isFullscreen.value = true;
  // Блокируем прокрутку body
  document.body.style.overflow = "hidden";
};

const closeFullscreen = () => {
  isFullscreen.value = false;
  // Возвращаем прокрутку
  document.body.style.overflow = "";
};

const saveFullscreen = () => {
  emit("update:modelValue", fullscreenValue.value);
  closeFullscreen();
};
</script>

<style scoped>
.fullscreen-textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.textarea-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.required {
  color: var(--danger);
}

.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.fullscreen-content {
  background-color: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.fullscreen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--divider);
}

.fullscreen-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.fullscreen-textarea {
  flex: 1;
  padding: 24px;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
}

.fullscreen-textarea::placeholder {
  color: var(--text-tertiary);
}

.fullscreen-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--divider);
}

@media (max-width: 768px) {
  .fullscreen-content {
    height: 95vh;
    max-width: 100%;
  }

  .fullscreen-overlay {
    padding: 10px;
  }
}
</style>
