import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useTelegramStore } from "./telegram";

export const useThemeStore = defineStore("theme", () => {
  const theme = ref("light");

  const isDark = computed(() => theme.value === "dark");

  // Watch for theme changes and apply to document
  watch(
    theme,
    (newTheme) => {
      document.documentElement.setAttribute("data-theme", newTheme);
      document.body.setAttribute("data-theme", newTheme);
    },
    { immediate: true }
  );

  function initTheme() {
    const telegramStore = useTelegramStore();

    if (telegramStore.tg) {
      theme.value = telegramStore.tg.colorScheme || "light";

      // Listen for theme changes
      telegramStore.tg.onEvent("themeChanged", () => {
        theme.value = telegramStore.tg.colorScheme || "light";
      });
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
      theme.value = prefersDark.matches ? "dark" : "light";

      // Listen for system theme changes
      prefersDark.addEventListener("change", (e) => {
        theme.value = e.matches ? "dark" : "light";
      });
    }

    // Apply initial theme
    document.documentElement.setAttribute("data-theme", theme.value);
    document.body.setAttribute("data-theme", theme.value);
  }

  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light";
  }

  function setTheme(newTheme) {
    if (newTheme === "light" || newTheme === "dark") {
      theme.value = newTheme;
    }
  }

  return {
    theme,
    isDark,
    initTheme,
    toggleTheme,
    setTheme,
  };
});
