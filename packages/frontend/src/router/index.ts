import { createRouter, createWebHistory } from "vue-router";
import type { InstrumentType } from "@investor-app/shared";
import { useAuthStore } from "@/stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/bonos" },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/bonos",
      name: "bonos",
      component: () => import("@/views/MarketView.vue"),
      props: { type: "BOND" as InstrumentType },
      meta: { requiresAuth: true },
    },
    {
      path: "/letras",
      name: "letras",
      component: () => import("@/views/MarketView.vue"),
      props: { type: "LETTER" as InstrumentType },
      meta: { requiresAuth: true },
    },
    {
      path: "/ons",
      name: "ons",
      component: () => import("@/views/MarketView.vue"),
      props: { type: "ON" as InstrumentType },
      meta: { requiresAuth: true },
    },
    {
      path: "/instrument/:ticker",
      name: "instrument",
      component: () => import("@/views/InstrumentView.vue"),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: "/curvas",
      name: "curvas",
      component: () => import("@/views/CurvesView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/compare",
      name: "compare",
      component: () => import("@/views/CompareView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/calendar",
      name: "calendar",
      component: () => import("@/views/CalendarView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/views/AdminView.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFoundView.vue"),
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0, behavior: "smooth" };
  },
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // Resolve auth state on first navigation
  if (authStore.status === "idle") {
    await authStore.fetchMe();
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  // Redirect authenticated users away from login page
  if (to.name === "login" && authStore.isAuthenticated) {
    return { path: "/" };
  }
});

export default router;
