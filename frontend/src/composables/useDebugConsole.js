import { ref } from "vue";

const ALLOWED_USER_IDS = import.meta.env.VITE_DEBUG_USER_IDS ? import.meta.env.VITE_DEBUG_USER_IDS.split(",").map((id) => id.trim()) : [];

let erudaInstance = null;

console.log("🔍 Debug Console: ALLOWED_USER_IDS =", ALLOWED_USER_IDS);

export function useDebugConsole() {
  const isErudaLoaded = ref(false);

  async function initializeEruda(userId) {
    console.log("🔍 initializeEruda вызван для userId:", userId);
    console.log("🔍 erudaInstance существует:", !!erudaInstance);

    if (erudaInstance) {
      isErudaLoaded.value = true;
      console.log("🔍 Eruda уже была инициализирована ранее");
      return;
    }

    // Проверяем, разрешен ли доступ для этого пользователя
    const isAllowed = ALLOWED_USER_IDS.length === 0 || ALLOWED_USER_IDS.includes(String(userId));

    console.log("🔍 Проверка доступа:");
    console.log("   - userId (string):", String(userId));
    console.log("   - ALLOWED_USER_IDS:", ALLOWED_USER_IDS);
    console.log("   - isAllowed:", isAllowed);

    if (!isAllowed) {
      console.debug("Debug console не активирована для текущего пользователя");
      return;
    }

    try {
      console.log("🔍 Начинаем импорт Eruda...");
      const eruda = await import("eruda");
      eruda.default.init();
      erudaInstance = eruda.default;
      isErudaLoaded.value = true;
      console.log("🔧 Eruda console инициализирована для пользователя:", userId);
      console.log("🔍 isErudaLoaded.value =", isErudaLoaded.value);
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
