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
    return { name: "dashboard" };
  }

  return null;
}
