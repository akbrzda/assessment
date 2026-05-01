<template>
  <header
    class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-[hsl(var(--topbar-bg)/0.92)] px-3 backdrop-blur sm:px-4 lg:px-6"
  >
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
      aria-label="Открыть меню"
      @click="$emit('toggle-sidebar')"
    >
      <component :is="MenuIcon" :size="20" />
    </button>

    <nav class="flex flex-1 items-center gap-1.5 overflow-hidden text-sm" aria-label="Навигация">
      <RouterLink to="/dashboard" class="text-muted-foreground transition hover:text-foreground shrink-0">
        <component :is="HomeIcon" :size="15" />
      </RouterLink>
      <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
        <span class="text-muted-foreground/60 shrink-0">›</span>
        <RouterLink
          :to="crumb.path"
          :class="['truncate transition', i === breadcrumbs.length - 1 ? 'font-semibold text-nav-active-text' : 'text-muted-foreground hover:text-foreground']"
          >{{ crumb.label }}</RouterLink
        >
      </template>
    </nav>

    <div class="flex items-center gap-2">
      <div class="relative hidden items-center md:flex">
        <component :is="SearchIcon" :size="14" class="pointer-events-none absolute left-2.5 text-muted-foreground" />
        <input
          v-model="searchQuery"
          type="search"
          class="h-10 w-72 rounded-xl border border-input bg-background pl-8 pr-14 text-sm placeholder:text-muted-foreground transition-all duration-[var(--motion-fast)] focus:border-ring focus:outline-none focus-visible:shadow-[var(--focus-ring)]"
          placeholder="Поиск..."
          @input="handleSearchInput"
          @blur="hideSearch"
        />
        <span class="pointer-events-none absolute right-2 rounded-md border border-border bg-muted/45 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
          >⌘K</span
        >
        <div
          v-if="showSearchResults"
          class="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-md"
        >
          <div v-if="searchLoading" class="px-3 py-2.5 text-sm text-muted-foreground">Поиск...</div>
          <template v-else>
            <button
              v-for="item in flattenedSearchResults"
              :key="item.key"
              class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent/40 transition"
              @click="openSearchResult(item)"
            >
              <span class="shrink-0 text-xs text-muted-foreground w-20">{{ item.type }}</span>
              <span class="truncate text-foreground">{{ item.title }}</span>
            </button>
            <div v-if="!flattenedSearchResults.length" class="px-3 py-2.5 text-sm text-muted-foreground">Ничего не найдено</div>
          </template>
        </div>
      </div>

      <RouterLink
        to="/assessments/create"
        class="hidden h-9 items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary transition hover:bg-primary/15 md:inline-flex"
        >Создать</RouterLink
      >

      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
        @click="toggleTheme"
      >
        <component :is="themeMode === 'dark' ? SunIcon : MoonIcon" :size="16" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useThemeStore } from "../../stores/theme";
import { globalSearch } from "../../api/users";
import { Menu as MenuIcon, Home as HomeIcon, Search as SearchIcon, Sun as SunIcon, Moon as MoonIcon } from "lucide-vue-next";

defineProps({ sidebarCollapsed: { type: Boolean, default: false } });
defineEmits(["toggle-sidebar"]);

const route = useRoute();
const router = useRouter();
const themeStore = useThemeStore();
const themeMode = computed(() => themeStore.themeMode);
const toggleTheme = () => themeStore.setThemeMode(themeMode.value === "dark" ? "light" : "dark");

const searchQuery = ref("");
const searchLoading = ref(false);
const searchResults = ref({ users: [], assessments: [], questions: [] });
const showSearchResults = ref(false);
let searchTimer = null;

const sectionLabels = {
  dashboard: "Дашборд",
  users: "Пользователи",
  courses: "Курсы",
  assessments: "Аттестации",
  questions: "Банк вопросов",
  reports: "Отчёты",
  branches: "Филиалы",
  positions: "Должности",
  invitations: "Приглашения",
  settings: "Настройки",
  profile: "Профиль",
};

const breadcrumbs = computed(() => {
  const segments = route.path.split("/").filter(Boolean);
  if (!segments.length) return [];
  const crumbs = [];
  const label = sectionLabels[segments[0]];
  if (label) crumbs.push({ label, path: "/" + segments[0] });
  if (segments.length > 1 && route.meta?.title) crumbs.push({ label: route.meta.title, path: route.path });
  return crumbs;
});

const flattenedSearchResults = computed(() =>
  [
    ...(searchResults.value.users || []).map((u) => ({
      key: `u-${u.id}`,
      type: "Пользователь",
      title: `${u.first_name} ${u.last_name}`,
      route: "/users",
    })),
    ...(searchResults.value.assessments || []).map((a) => ({ key: `a-${a.id}`, type: "Аттестация", title: a.title, route: `/assessments/${a.id}` })),
    ...(searchResults.value.questions || []).map((q) => ({ key: `q-${q.id}`, type: "Вопрос", title: q.question_text, route: `/questions/${q.id}` })),
  ].slice(0, 10),
);

const handleSearchInput = () => {
  const q = String(searchQuery.value || "").trim();
  showSearchResults.value = q.length >= 2;
  clearTimeout(searchTimer);
  if (q.length < 2) {
    searchResults.value = { users: [], assessments: [], questions: [] };
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      searchLoading.value = true;
      searchResults.value = await globalSearch({ query: q, limit: 6 });
    } catch {
      searchResults.value = { users: [], assessments: [], questions: [] };
    } finally {
      searchLoading.value = false;
    }
  }, 250);
};

const hideSearch = () =>
  setTimeout(() => {
    showSearchResults.value = false;
  }, 200);

const openSearchResult = (item) => {
  showSearchResults.value = false;
  searchQuery.value = "";
  router.push(item.route);
};
</script>
