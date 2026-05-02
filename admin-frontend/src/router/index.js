import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import LoginView from "../modules/auth/views/LoginView.vue";
import MainLayout from "../components/layout/MainLayout.vue";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: LoginView,
    meta: { requiresAuth: false, title: "Вход" },
  },
  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: "/dashboard",
      },
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("../modules/dashboard/views/DashboardView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Панель управления" },
      },
      {
        path: "users",
        name: "Users",
        component: () => import("../modules/users/views/UsersView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "users", title: "Пользователи" },
      },
      {
        path: "users/:id/profile",
        name: "UserDetails",
        component: () => import("../modules/users/views/UserDetailsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "users", title: "Профиль пользователя" },
      },
      {
        path: "assessments",
        name: "Assessments",
        component: () => import("../modules/assessments/views/AssessmentsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "assessments", title: "Аттестации" },
      },
      {
        path: "assessments/create",
        name: "CreateAssessment",
        component: () => import("../modules/assessments/views/CreateAssessmentView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "assessments", title: "Создать аттестацию" },
      },
      {
        path: "assessments/:id/edit",
        name: "EditAssessment",
        component: () => import("../modules/assessments/views/EditAssessmentView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "assessments", title: "Редактировать аттестацию" },
      },
      {
        path: "assessments/:id",
        name: "AssessmentDetails",
        component: () => import("../modules/assessments/views/AssessmentDetailsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "assessments", title: "Детали аттестации" },
      },
      {
        path: "assessments/:id/users/:userId",
        name: "AssessmentUserProgress",
        component: () => import("../modules/assessments/views/AssessmentUserProgressView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "assessments", title: "Прогресс пользователя" },
      },
      {
        path: "assessments/:id/theory",
        name: "AssessmentTheory",
        component: () => import("../modules/assessments/views/AssessmentTheoryView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "assessments", title: "Теория аттестации" },
      },
      {
        path: "courses",
        name: "Courses",
        component: () => import("../modules/courses/views/CoursesView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "courses", title: "Курсы" },
      },
      {
        path: "courses/create",
        name: "CreateCourse",
        component: () => import("../modules/courses/views/CourseEditorView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "courses", title: "Создать курс" },
      },
      {
        path: "courses/:id/edit",
        name: "EditCourse",
        component: () => import("../modules/courses/views/CourseEditorView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "courses", title: "Редактировать курс" },
      },
      {
        path: "courses/:id/statistics",
        name: "CourseStatistics",
        component: () => import("../modules/courses/views/CourseStatisticsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "courses", title: "Статистика курса" },
      },
      {
        path: "questions",
        name: "Questions",
        component: () => import("../modules/questions/views/QuestionsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "questions", title: "Банк вопросов" },
      },
      {
        path: "questions/create",
        name: "CreateQuestion",
        component: () => import("../modules/questions/views/CreateQuestionView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "questions", title: "Создать вопрос" },
      },
      {
        path: "questions/:id/edit",
        name: "EditQuestion",
        component: () => import("../modules/questions/views/EditQuestionView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "questions", title: "Редактировать вопрос" },
      },
      {
        path: "questions/:id",
        name: "QuestionDetails",
        component: () => import("../modules/questions/views/QuestionDetailsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "questions", title: "Детали вопроса" },
      },
      {
        path: "reports",
        name: "Reports",
        component: () => import("../modules/reports/views/ReportsView.vue"),
        meta: { roles: ["superadmin", "manager"], module: "analytics", title: "Отчёты и аналитика" },
      },
      {
        path: "branches",
        name: "Branches",
        component: () => import("../modules/branches/views/BranchesView.vue"),
        meta: { roles: ["superadmin"], module: "branches", title: "Филиалы" },
      },
      {
        path: "positions",
        name: "Positions",
        component: () => import("../modules/positions/views/PositionsView.vue"),
        meta: { roles: ["superadmin"], module: "positions", title: "Должности" },
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("../modules/settings/views/SettingsView.vue"),
        meta: { roles: ["superadmin"], module: "settings", title: "Настройки" },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("../modules/users/views/ProfileView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Профиль" },
      },
      {
        path: "404",
        name: "NotFound",
        component: () => import("../modules/auth/views/NotFoundView.vue"),
        meta: { title: "Страница не найдена" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: (to) => {
      return { name: "NotFound", query: { type: "not-found" } };
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Защита маршрутов
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth);
  const roleRestrictedRecord = [...to.matched].reverse().find((record) => Array.isArray(record.meta?.roles));
  const allowedRoles = roleRestrictedRecord?.meta?.roles;
  const requiredModule = to.meta?.module; // Код модуля, например "branches", "settings"

  // Обновить title страницы
  const baseTitle = "Система аттестаций";
  if (to.meta.title) {
    document.title = `${to.meta.title} | ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }

  // Если маршрут требует авторизации и пользователь не авторизован
  if (requiresAuth && !authStore.isAuthenticated) {
    const restored = await authStore.tryRestoreSession();
    if (!restored) {
      return next("/login");
    }
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    return next("/login");
  }

  // Если пользователь авторизован и пытается попасть на страницу логина
  if (to.path === "/login" && authStore.isAuthenticated) {
    return next("/dashboard");
  }

  // Загружаем права пользователя если они еще не загружены
  if (authStore.isAuthenticated && !authStore.permissionsLoaded) {
    await authStore.loadUserPermissions();
  }

  // Если указан модуль, проверяем права на модуль (приоритет над ролями)
  if (requiredModule) {
    if (!authStore.hasModuleAccess(requiredModule)) {
      return next({ name: "NotFound", query: { type: "forbidden" } });
    }
  } else if (allowedRoles) {
    // Проверка ролей только если нет модуля
    if (!allowedRoles.includes(authStore.user?.role)) {
      return next({ name: "NotFound", query: { type: "forbidden" } });
    }
  }

  next();
});

export default router;
