import { ref, onMounted } from "vue";
import { apiClient } from "@/services/apiClient";
import { getUserTimezone } from "@/utils/dateUtils";

/**
 * Composable для управления часовым поясом пользователя
 */
export function useTimezone() {
  const timezone = ref(getUserTimezone());
  const isUpdating = ref(false);
  const error = ref(null);

  /**
   * Обновляет часовой пояс пользователя на сервере
   */
  async function updateTimezone() {
    if (isUpdating.value) return;

    isUpdating.value = true;
    error.value = null;

    try {
      const currentTimezone = getUserTimezone();
      timezone.value = currentTimezone;

      await apiClient.updateTimezone(currentTimezone);

      console.log("✅ Часовой пояс обновлен:", currentTimezone);
    } catch (err) {
      error.value = err.message;
      console.error("❌ Ошибка обновления часового пояса:", err);
    } finally {
      isUpdating.value = false;
    }
  }

  /**
   * Инициализирует часовой пояс при загрузке приложения
   */
  function initTimezone() {
    // Обновляем часовой пояс при каждой загрузке приложения
    // чтобы учитывать перемещения пользователя
    updateTimezone();
  }

  return {
    timezone,
    isUpdating,
    error,
    updateTimezone,
    initTimezone,
  };
}
