import { useTelegramStore } from "../../stores/telegram";

export async function resolveAuthNavigation(to, userStore) {
  try {
    await userStore.ensureStatus();
  } catch (error) {
    console.error("Не удалось проверить авторизацию", error);
    if (to.meta.requiresAuth) {
      return "/invitation";
    }
  }

  if (userStore.error && !to.meta.requiresAuth) {
    return null;
  }

  const isAuthenticated = userStore.isAuthenticated;
  if (!isAuthenticated) {
    if (to.name !== "invitation") {
      return { name: "invitation" };
    }

    return null;
  }

  if (to.name === "invitation") {
    // Если есть deep link на курс — открываем курс вместо dashboard
    const telegramStore = useTelegramStore();
    const courseId = telegramStore.pendingCourseId;
    if (courseId) {
      telegramStore.pendingCourseId = null;
      return { name: "course-details", params: { id: courseId } };
    }
    return { name: "dashboard" };
  }

  return null;
}
