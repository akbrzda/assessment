import { defineStore } from "pinia";

const THEME_KEY = "themeMode";
const SIDEBAR_KEY = "sidebarCollapsed";

export const useThemeStore = defineStore("theme", {
  state: () => ({
    themeMode: localStorage.getItem(THEME_KEY) || "system",
    resolvedTheme: "light",
    sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === "true",
    mediaQuery: null,
    systemListener: null,
  }),

  getters: {
    theme(state) {
      if (state.themeMode === "light" || state.themeMode === "dark") {
        return state.themeMode;
      }
      return state.resolvedTheme;
    },
  },

  actions: {
    init() {
      if (typeof window !== "undefined" && window.matchMedia) {
        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.resolvedTheme = this.mediaQuery.matches ? "dark" : "light";

        const listener = (event) => {
          this.handleSystemThemeChange(event.matches);
        };

        if (this.mediaQuery.addEventListener) {
          this.mediaQuery.addEventListener("change", listener);
        } else if (this.mediaQuery.addListener) {
          this.mediaQuery.addListener(listener);
        }

        this.systemListener = listener;
      } else {
        this.resolvedTheme = "light";
      }

      this.applyTheme();
    },

    handleSystemThemeChange(matchesDark) {
      this.resolvedTheme = matchesDark ? "dark" : "light";
      if (this.themeMode === "system") {
        this.applyTheme();
      }
    },

    setThemeMode(mode) {
      this.themeMode = mode;
      localStorage.setItem(THEME_KEY, mode);
      this.applyTheme();
    },

    cycleThemeMode() {
      const modes = ["light", "dark", "system"];
      const currentIndex = modes.indexOf(this.themeMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      this.setThemeMode(nextMode);
    },

    toggleTheme() {
      this.cycleThemeMode();
    },

    applyTheme() {
      const theme = this.theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
    },

    setSidebarCollapsed(value) {
      this.sidebarCollapsed = value;
      localStorage.setItem(SIDEBAR_KEY, value ? "true" : "false");
    },

    toggleSidebarCollapsed() {
      this.setSidebarCollapsed(!this.sidebarCollapsed);
    },
  },
});
