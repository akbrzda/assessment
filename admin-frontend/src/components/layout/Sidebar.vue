<template>
  <aside :class="asideClasses">
    <div class="flex h-full flex-col">
      <!-- Кнопка закрытия на мобильных -->
      <button
        v-if="isOpen"
        type="button"
        class="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-muted-foreground transition hover:bg-accent/40 hover:text-foreground lg:hidden"
        aria-label="Закрыть меню"
        @click.stop="$emit('close')"
      >
        <component :is="XIcon" :size="16" />
      </button>

      <!-- Бренд -->
      <div :class="['flex items-center', isCollapsed ? 'justify-center py-4' : 'min-h-[64px] gap-3 px-4']">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <component :is="LayoutTemplateIcon" :size="18" />
        </div>
        <div v-if="!isCollapsed" class="min-w-0">
          <p class="truncate text-[15px] font-semibold text-foreground">Theorica</p>
          <p class="text-xs text-muted-foreground">Административная панель</p>
        </div>
      </div>

      <!-- Навигация -->
      <div class="flex-1 overflow-y-auto px-3 pb-3">
        <nav :class="['flex flex-col text-sm', isCollapsed ? '' : 'gap-3']">
          <div v-for="section in navSections" :key="section.id" class="space-y-1">
            <div v-if="!isCollapsed" class="nav-group-title">{{ section.title }}</div>
            <div class="flex flex-col gap-0.5">
              <RouterLink
                v-for="item in section.items"
                :key="item.label"
                :to="item.to"
                class="nav-link"
                :title="item.label"
                @click="$emit('navigate')"
              >
                <component :is="item.icon" :size="18" />
                <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
              </RouterLink>
            </div>
          </div>
        </nav>
      </div>

      <!-- Профиль пользователя внизу -->
      <div class="border-t border-border/60 p-3">
        <div
          v-if="!authStore.user"
          :class="['flex items-center rounded-xl px-3 py-2 text-sm text-foreground', isCollapsed ? 'justify-center' : 'gap-3']"
        >
          <div class="skeleton-shimmer h-8 w-8 rounded-full"></div>
          <div v-if="!isCollapsed" class="flex-1 space-y-1">
            <div class="skeleton-shimmer h-3 w-24 rounded"></div>
            <div class="skeleton-shimmer h-3 w-20 rounded"></div>
          </div>
        </div>
        <div v-else :class="['flex items-center rounded-xl px-3 py-2 text-sm text-foreground', isCollapsed ? 'justify-center' : 'gap-3']">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {{ initials }}
          </div>
          <div v-if="!isCollapsed" class="min-w-0 flex-1">
            <div class="truncate font-medium text-sm">{{ userName }}</div>
            <div class="truncate text-xs text-muted-foreground">{{ userRole }}</div>
          </div>
          <button
            v-if="!isCollapsed"
            type="button"
            class="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
            title="Выйти"
            @click="handleLogout"
          >
            <component :is="LogOutIcon" :size="15" />
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import {
  LayoutDashboard as LayoutDashboardIcon,
  Users as UsersIcon,
  ClipboardList as ClipboardListIcon,
  BookOpenCheck as BookOpenCheckIcon,
  FileQuestion as FileQuestionIcon,
  BarChart3 as BarChart3Icon,
  Link2 as Link2Icon,
  Building2 as Building2Icon,
  Briefcase as BriefcaseIcon,
  Settings as SettingsIcon,
  LayoutTemplate as LayoutTemplateIcon,
  LogOut as LogOutIcon,
  X as XIcon,
} from "lucide-vue-next";

const authStore = useAuthStore();

const props = defineProps({
  isOpen: { type: Boolean, default: true },
  isCollapsed: { type: Boolean, default: false },
});

defineEmits(["close", "navigate"]);

const userName = computed(() => {
  const u = authStore.user;
  if (!u) return "Пользователь";
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Пользователь";
});

const userRole = computed(() => {
  const roles = { superadmin: "Суперадмин", manager: "Менеджер" };
  return roles[authStore.user?.role] || authStore.user?.role || "";
});

const initials = computed(() => {
  const u = authStore.user;
  if (!u) return "?";
  const first = u.firstName?.[0] || "";
  const last = u.lastName?.[0] || "";
  return (first + last).toUpperCase() || u.email?.[0]?.toUpperCase() || "?";
});

const navSections = computed(() => {
  const isSA = authStore.isSuperAdmin;
  const has = (mod) => isSA || authStore.hasModuleAccess(mod);

  const sections = [
    {
      id: "main",
      title: "Главное",
      items: [
        { label: "Дашборд", to: "/dashboard", icon: LayoutDashboardIcon },
        has("users") && { label: "Пользователи", to: "/users", icon: UsersIcon },
        has("invitations") && { label: "Приглашения", to: "/invitations", icon: Link2Icon },
      ].filter(Boolean),
    },
    {
      id: "learning",
      title: "Обучение",
      items: [
        has("assessments") && { label: "Аттестации", to: "/assessments", icon: ClipboardListIcon },
        has("courses") && { label: "Курсы", to: "/courses", icon: BookOpenCheckIcon },
        has("questions") && { label: "Банк вопросов", to: "/questions", icon: FileQuestionIcon },
      ].filter(Boolean),
    },
    {
      id: "analytics",
      title: "Аналитика",
      items: [has("analytics") && { label: "Отчёты", to: "/reports", icon: BarChart3Icon }].filter(Boolean),
    },
    {
      id: "admin",
      title: "Администрирование",
      items: [
        has("branches") && { label: "Филиалы", to: "/branches", icon: Building2Icon },
        has("positions") && { label: "Должности", to: "/positions", icon: BriefcaseIcon },
        has("settings") && { label: "Настройки", to: "/settings", icon: SettingsIcon },
      ].filter(Boolean),
    },
  ];

  return sections.map((s) => ({ ...s, items: s.items.filter((i) => i) })).filter((s) => s.items.length > 0);
});

const asideClasses = computed(() => ["sidebar", props.isOpen ? "is-open" : "is-closed", props.isCollapsed ? "is-collapsed" : ""]);

const handleLogout = async () => {
  await authStore.logout();
};
</script>

<style scoped>
.sidebar {
  @apply relative flex h-screen w-60 shrink-0 flex-col border-r border-border/60 pt-0 backdrop-blur transition-all duration-[var(--motion-base)] lg:sticky lg:top-0;
  background: linear-gradient(180deg, hsl(var(--sidebar-bg-start)) 0%, hsl(var(--sidebar-bg-end)) 100%), hsl(var(--card));
}

.sidebar.is-collapsed {
  @apply w-[72px];
}

@media (max-width: 1023px) {
  .sidebar {
    @apply fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-1rem))] -translate-x-full;
  }

  .sidebar.is-open {
    @apply translate-x-0;
  }

  .sidebar.is-collapsed {
    @apply w-72;
  }
}

.nav-group-title {
  @apply px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground;
}

.nav-link {
  @apply relative flex min-h-[40px] items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-[var(--motion-fast)] hover:bg-[hsl(var(--state-hover))] hover:text-foreground;
  letter-spacing: 0.01em;
}

.nav-link::before {
  content: "";
  @apply absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-full bg-transparent transition-colors duration-[var(--motion-fast)];
}

.sidebar.is-collapsed .nav-link {
  @apply justify-center px-0;
}

.router-link-active {
  @apply bg-nav-active text-nav-active-text font-semibold;
}

.router-link-active::before {
  background: hsl(var(--sidebar-active-indicator));
}
</style>
