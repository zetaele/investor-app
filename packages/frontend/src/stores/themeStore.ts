import { defineStore } from "pinia";
import { ref, watch } from "vue";

type Theme = "dark" | "light";

const STORAGE_KEY = "investor-app-theme";

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

/**
 * Manages the application's color theme (dark / light).
 * Persists the user's choice to localStorage and falls back to the OS preference.
 */
export const useThemeStore = defineStore("theme", () => {
  const theme = ref<Theme>(getStoredTheme() ?? getSystemTheme());

  // Apply on init
  applyTheme(theme.value);

  // Apply and persist on every change
  watch(theme, (next) => {
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  function toggle(): void {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  const isDark = () => theme.value === "dark";

  return { theme, toggle, isDark };
});
