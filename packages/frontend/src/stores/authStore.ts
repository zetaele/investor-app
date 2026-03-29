import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: "FREE" | "PRO" | "ADVANCED";
}

/**
 * Manages the authenticated user's session.
 * Reads/writes the HttpOnly session cookie via the backend — no token stored in JS.
 */
export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const status = ref<"idle" | "loading" | "authenticated" | "unauthenticated">("idle");

  const isAuthenticated = computed(() => status.value === "authenticated");

  async function fetchMe(): Promise<void> {
    if (status.value === "loading") return;
    status.value = "loading";
    try {
      const res = await fetch("/auth/me", { credentials: "include" });
      if (res.ok) {
        user.value = (await res.json()) as AuthUser;
        status.value = "authenticated";
      } else {
        user.value = null;
        status.value = "unauthenticated";
      }
    } catch {
      user.value = null;
      status.value = "unauthenticated";
    }
  }

  async function logout(): Promise<void> {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    user.value = null;
    status.value = "unauthenticated";
  }

  function loginWithGoogle(): void {
    window.location.href = "/auth/login";
  }

  return { user, status, isAuthenticated, fetchMe, logout, loginWithGoogle };
});
