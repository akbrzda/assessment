import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import LoginView from "../views/LoginView.vue";
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
        component: () => import("../views/DashboardView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Панель управления" },
      },
      {
        path: "users",
        name: "Users",
        component: () => import("../views/UsersView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Пользователи" },
      },
      {
        path: "invitations",
        name: "Invitations",
        component: () => import("../views/InvitationsView.vue"),
        meta: { roles: ["superadmin"], title: "Приглашения" },
      },
      {
        path: "assessments",
        name: "Assessments",
        component: () => import("../views/AssessmentsView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Аттестации" },
      },
      {
        path: "assessments/create",
        name: "CreateAssessment",
        component: () => import("../views/CreateAssessmentView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Создать аттестацию" },
      },
      {
        path: "assessments/:id/edit",
        name: "EditAssessment",
        component: () => import("../views/EditAssessmentView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Редактировать аттестацию" },
      },
      {
        path: "assessments/:id",
        name: "AssessmentDetails",
        component: () => import("../views/AssessmentDetailsView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Детали аттестации" },
      },
      {
        path: "assessments/:id/theory",
        name: "AssessmentTheory",
        component: () => import("../views/AssessmentTheoryView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Теория аттестации" },
      },
      {
        path: "questions",
        name: "Questions",
        component: () => import("../views/QuestionsView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Банк вопросов" },
      },
      {
        path: "questions/create",
        name: "CreateQuestion",
        component: () => import("../views/CreateQuestionView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Создать вопрос" },
      },
      {
        path: "questions/:id/edit",
        name: "EditQuestion",
        component: () => import("../views/EditQuestionView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Редактировать вопрос" },
      },
      {
        path: "questions/:id",
        name: "QuestionDetails",
        component: () => import("../views/QuestionDetailsView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Детали вопроса" },
      },
      {
        path: "reports",
        name: "Reports",
        component: () => import("../views/ReportsView.vue"),
        meta: { roles: ["superadmin", "manager"], title: "Отчёты и аналитика" },
      },
      {
        path: "branches",
        name: "Branches",
        component: () => import("../views/BranchesView.vue"),
        meta: { roles: ["superadmin"], title: "Филиалы" },
      },
      {
        path: "positions",
        name: "Positions",
        component: () => import("../views/PositionsView.vue"),
        meta: { roles: ["superadmin"], title: "Должности" },
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("../views/SettingsView.vue"),
        meta: { roles: ["superadmin"], title: "Настройки" },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Защита маршрутов
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth);
  const roleRestrictedRecord = [...to.matched].reverse().find((record) => Array.isArray(record.meta?.roles));
  const allowedRoles = roleRestrictedRecord?.meta?.roles;

  // Обновить title страницы
  const baseTitle = "Система аттестаций";
  if (to.meta.title) {
    document.title = `${to.meta.title} | ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }

  // Если маршрут требует авторизации и пользователь не авторизован
  if (requiresAuth && !authStore.isAuthenticated) {
    return next("/login");
  }

  // Если пользователь авторизован и пытается попасть на страницу логина
  if (to.path === "/login" && authStore.isAuthenticated) {
    return next("/dashboard");
  }

  // Проверка ролей
  if (allowedRoles && !allowedRoles.includes(authStore.user?.role)) {
    return next("/dashboard");
  }

  next();
});

export default router;
