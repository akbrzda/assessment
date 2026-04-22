import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "../stores/user";
import { resolveAuthNavigation } from "./guards/authGuard";

const routes = [
  {
    path: "/",
    redirect: "/dashboard",
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
    path: "/courses/:id",
    name: "course-details",
    component: () => import("../views/CourseDetailsView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/courses/:courseId/topics/:sectionId",
    name: "course-topic",
    component: () => import("../views/TopicView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/courses/:courseId/topics/:sectionId/subtopics/:topicId",
    name: "course-subtopic",
    component: () => import("../views/SubtopicView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/courses/:courseId/status/:statusType",
    name: "course-status-page",
    component: () => import("../views/CourseStatusPageView.vue"),
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
  {
    path: "/:pathMatch(.*)*",
    redirect: "/invitation",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  const navigationTarget = await resolveAuthNavigation(to, userStore);
  if (navigationTarget) {
    return next(navigationTarget);
  }
  return next();
});

export default router;
