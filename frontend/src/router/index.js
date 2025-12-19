import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "../stores/user";

const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/registration",
    name: "registration",
    component: () => import("../views/RegistrationView.vue"),
  },
  {
    path: "/invitation",
    name: "invitation",
    component: () => import("../views/InvitationView.vue"),
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("../views/DashboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/assessments",
    name: "assessments",
    component: () => import("../views/AssessmentsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/assessment/:id",
    name: "assessment-process",
    component: () => import("../views/AssessmentProcessView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/assessment/:id/theory",
    name: "assessment-theory",
    component: () => import("../views/AssessmentTheoryView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/assessment-results/:id",
    name: "assessment-results",
    component: () => import("../views/AssessmentResultsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/leaderboard",
    name: "leaderboard",
    component: () => import("../views/LeaderboardView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/profile",
    name: "profile",
    component: () => import("../views/ProfileView.vue"),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  // Инициализируем стор если нужно - ВСЕГДА ждем инициализации
  try {
    await userStore.ensureStatus();
  } catch (error) {
    console.error("Не удалось проверить авторизацию", error);
    // При ошибке авторизации стараемся отправить пользователя в регистрацию
    if (to.meta.requiresAuth && to.name !== "registration") {
      return next("/registration");
    }
  }

  // Если есть ошибка авторизации, но это не защищенная страница - пропускаем
  if (userStore.error && !to.meta.requiresAuth) {
    return next();
  }

  const isAuthenticated = userStore.isAuthenticated;
  const hasInvitation = Boolean(userStore.invitation);

  // Если пользователь не авторизован
  if (!isAuthenticated) {
    // Если есть приглашение - направляем на страницу приглашения
    if (hasInvitation) {
      if (to.name !== "invitation") {
        return next({ name: "invitation" });
      }
      return next();
    }

    // Если нет приглашения - направляем на регистрацию
    if (to.name !== "registration") {
      return next({ name: "registration" });
    }

    return next();
  } else {
    // Пользователь авторизован
    const currentRoute = to.name;
    // Защищаем от повторного попадания на страницы регистрации/приглашения
    if (["registration", "invitation"].includes(currentRoute)) {
      return next({ name: "dashboard" });
    }
  }

  next();
});

export default router;
