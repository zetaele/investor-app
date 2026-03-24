import { createRouter, createWebHistory } from "vue-router";
import type { InstrumentType } from "@investor-app/shared";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/bonos" },
    {
      path: "/bonos",
      name: "bonos",
      component: () => import("@/views/MarketView.vue"),
      props: { type: "BOND" as InstrumentType },
    },
    {
      path: "/letras",
      name: "letras",
      component: () => import("@/views/MarketView.vue"),
      props: { type: "LETTER" as InstrumentType },
    },
    {
      path: "/ons",
      name: "ons",
      component: () => import("@/views/MarketView.vue"),
      props: { type: "ON" as InstrumentType },
    },
    {
      path: "/instrument/:ticker",
      name: "instrument",
      component: () => import("@/views/InstrumentView.vue"),
      props: true,
    },
    {
      path: "/compare",
      name: "compare",
      component: () => import("@/views/CompareView.vue"),
    },
    {
      path: "/calendar",
      name: "calendar",
      component: () => import("@/views/CalendarView.vue"),
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/views/AdminView.vue"),
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

export default router;
