import { defineStore } from "pinia";

const THEME_KEY = "themeMode";
const SIDEBAR_KEY = "sidebarCollapsed";

export const useThemeStore = defineStore("theme", {
  state: () => ({
    themeMode: localStorage.getItem(THEME_KEY) || "light",
    sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === "true",
  }),

  getters: {
    theme(state) {
      return state.themeMode === "dark" ? "dark" : "light";
    },
  },

  actions: {
    init() {
      if (this.themeMode !== "light" && this.themeMode !== "dark") {
        this.themeMode = "light";
      }
      this.applyTheme();
    },

    setThemeMode(mode) {
      if (mode !== "light" && mode !== "dark") {
        return;
      }
      this.themeMode = mode;
      localStorage.setItem(THEME_KEY, mode);
      this.applyTheme();
    },

    cycleThemeMode() {
      const nextMode = this.themeMode === "light" ? "dark" : "light";
      this.setThemeMode(nextMode);
    },

    toggleTheme() {
      this.cycleThemeMode();
    },

    applyTheme() {
      document.documentElement.classList.toggle("dark", this.theme === "dark");
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
