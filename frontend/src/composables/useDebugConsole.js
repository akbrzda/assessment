import { ref } from "vue";

const ALLOWED_USER_IDS = import.meta.env.VITE_DEBUG_USER_IDS ? import.meta.env.VITE_DEBUG_USER_IDS.split(",").map((id) => id.trim()) : [];

let erudaInstance = null;

export function useDebugConsole() {
  const isErudaLoaded = ref(false);

  async function initializeEruda(userId) {
    if (erudaInstance) {
      isErudaLoaded.value = true;
      return;
    }

    // Проверяем, разрешен ли доступ для этого пользователя
    const isAllowed = ALLOWED_USER_IDS.length === 0 || ALLOWED_USER_IDS.includes(String(userId));

    if (!isAllowed) {
      return;
    }

    try {
      const eruda = await import("eruda");
      eruda.default.init();
      erudaInstance = eruda.default;
      isErudaLoaded.value = true;
      console.log("🔧 Eruda console инициализирована");
    } catch (error) {
      console.error("Ошибка при инициализации Eruda:", error);
    }
  }

  function toggle() {
    if (erudaInstance) {
      erudaInstance.toggle();
    } else {
      console.warn("Eruda console не инициализирована");
    }
  }

  function show() {
    if (erudaInstance) {
      erudaInstance.show();
    }
  }

  function hide() {
    if (erudaInstance) {
      erudaInstance.hide();
    }
  }

  return {
    initializeEruda,
    toggle,
    show,
    hide,
    isErudaLoaded,
  };
}
