import { useTelegramStore } from "../../stores/telegram";

export async function resolveAuthNavigation(to, userStore) {
  try {
    await userStore.ensureStatus();
  } catch (error) {
    if (error?.code !== "INIT_DATA_MISSING") {
      console.error("Не удалось проверить авторизацию", error);
    }
    if (to.meta.requiresAuth) {
      return { name: "invitation" };
    }
  }

  if (userStore.error && !to.meta.requiresAuth) {
    return null;
  }

  const isAuthenticated = userStore.isAuthenticated;
  if (!isAuthenticated) {
    const hasInviteCode = Boolean(userStore.inviteFlow?.hasInviteCode);
    const registrationByInvitationOnly = Boolean(userStore.inviteFlow?.registrationByInvitationOnly);
    const publicTarget = hasInviteCode || registrationByInvitationOnly ? "invitation" : "registration";

    if (to.name !== "invitation" && to.name !== "registration") {
      return { name: publicTarget };
    }

    if (hasInviteCode && to.name === "registration") {
      return { name: "invitation" };
    }

    if (!hasInviteCode && !registrationByInvitationOnly && to.name === "invitation") {
      return { name: "registration" };
    }

    return null;
  }

  if (to.name === "invitation" || to.name === "registration") {
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
