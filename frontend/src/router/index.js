import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import RegisterView from '../views/RegisterView.vue';
import InviteView from '../views/InviteView.vue';
import ProfileView from '../views/ProfileView.vue';
import ComingSoonView from '../views/ComingSoonView.vue';
import SettingsView from '../views/SettingsView.vue';
import { useAppStore } from '../store/appStore';
import { hideBackButton } from '../services/telegram';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/invite', name: 'invite', component: InviteView },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/assessments', name: 'assessments', component: ComingSoonView, meta: { requiresAuth: true } },
  { path: '/leaderboard', name: 'leaderboard', component: ComingSoonView, meta: { requiresAuth: true } },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

let isGuardRegistered = false;

router.beforeEach(async (to, from, next) => {
  const appStore = useAppStore();

  if (!isGuardRegistered) {
    isGuardRegistered = true;
  }

  if (!appStore.isInitialized && !appStore.isLoading) {
    await appStore.ensureReady();
  }

  if (appStore.error) {
    return next();
  }

  const isAuthenticated = appStore.isAuthenticated;

  if (!isAuthenticated) {
    if (appStore.invitation && !appStore.invitationAccepted && to.name !== 'invite') {
      return next({ name: 'invite' });
    }
    if (to.meta.requiresAuth) {
      return next({ name: appStore.invitation ? 'invite' : 'register' });
    }
  } else {
    if (appStore.invitation && !appStore.invitationAccepted && to.name !== 'invite') {
      return next({ name: 'invite' });
    }
    if (to.meta.requiresSuperAdmin && !appStore.isSuperAdmin) {
      return next({ name: 'dashboard' });
    }
    if (['register', 'invite'].includes(to.name)) {
      return next({ name: 'dashboard' });
    }
  }

  hideBackButton();
  return next();
});

export default router;
