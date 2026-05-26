import { ref, computed, onMounted, onUnmounted } from "vue";
import { useTelegramStore } from "../stores/telegram";

const globalUnsavedChanges = ref(new Set());
let currentClosingState = false;

export function useUnsavedChanges(componentId = null) {
  const telegramStore = useTelegramStore();

  // Уникальный ID для компонента
  const id =
    componentId || `component-${Math.random().toString(36).substr(2, 9)}`;

  // Локальное состояние unsaved changes для этого компонента
  const hasUnsavedChanges = ref(false);

  // Глобальное состояние - есть ли где-то unsaved changes
  const globalHasUnsavedChanges = computed(() => {
    return globalUnsavedChanges.value.size > 0;
  });

  // Добавить этот компонент в список компонентов с unsaved changes
  const markAsUnsaved = () => {
    hasUnsavedChanges.value = true;
    globalUnsavedChanges.value.add(id);
    updateClosingConfirmation();
  };

  // Убрать этот компонент из списка компонентов с unsaved changes
  const markAsSaved = () => {
    hasUnsavedChanges.value = false;
    globalUnsavedChanges.value.delete(id);
    updateClosingConfirmation();
  };

  // Обновить состояние подтверждения закрытия
  const updateClosingConfirmation = () => {
    const shouldShowConfirmation = globalUnsavedChanges.value.size > 0;

    if (shouldShowConfirmation && !currentClosingState) {
      telegramStore.enableClosingConfirmation();
      currentClosingState = true;
    } else if (!shouldShowConfirmation && currentClosingState) {
      telegramStore.disableClosingConfirmation();
      currentClosingState = false;
    }
  };

  // Очистить состояние при размонтировании компонента
  onUnmounted(() => {
    if (hasUnsavedChanges.value) {
      globalUnsavedChanges.value.delete(id);
      updateClosingConfirmation();
    }
  });

  return {
    hasUnsavedChanges,
    globalHasUnsavedChanges,
    markAsUnsaved,
    markAsSaved,
    updateClosingConfirmation,
  };
}

// Утилитарные функции для использования без создания экземпляра
export function enableClosingConfirmationGlobally() {
  const telegramStore = useTelegramStore();
  telegramStore.enableClosingConfirmation();
  currentClosingState = true;
}

export function disableClosingConfirmationGlobally() {
  const telegramStore = useTelegramStore();
  telegramStore.disableClosingConfirmation();
  currentClosingState = false;
}

export function getGlobalUnsavedChangesCount() {
  return globalUnsavedChanges.value.size;
}
