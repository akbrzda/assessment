export async function resolveAuthNavigation(to, userStore) {
  try {
    await userStore.ensureStatus();
  } catch (error) {
    console.error("Не удалось проверить авторизацию", error);
    if (to.meta.requiresAuth && to.name !== "registration") {
      return "/registration";
    }
  }

  if (userStore.error && !to.meta.requiresAuth) {
    return null;
  }

  const isAuthenticated = userStore.isAuthenticated;
  const hasInvitation = Boolean(userStore.invitation);

  if (!isAuthenticated) {
    if (hasInvitation) {
      if (to.name !== "invitation") {
        return { name: "invitation" };
      }
      return null;
    }

    if (to.name !== "registration") {
      return { name: "registration" };
    }

    return null;
  }

  if (["registration", "invitation"].includes(to.name)) {
    return { name: "dashboard" };
  }

  return null;
}
