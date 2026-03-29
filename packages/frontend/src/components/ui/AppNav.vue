<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";

const route = useRoute();
const router = useRouter();
const themeStore = useThemeStore();
const authStore = useAuthStore();

async function handleLogout(): Promise<void> {
  await authStore.logout();
  router.push("/login");
}
</script>

<template>
  <nav class="app-nav">
    <div class="nav-inner">
      <!-- Logo -->
      <RouterLink to="/" class="nav-logo">
        <span class="logo-mark">▲</span>
        <span class="logo-text">Inversor<span class="logo-accent">AR</span></span>
      </RouterLink>

      <!-- Nav links -->
      <ul class="nav-links">
        <li>
          <RouterLink to="/bonos" class="nav-link" :class="{ active: route.name === 'bonos' }">
            Bonos
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/letras" class="nav-link" :class="{ active: route.name === 'letras' }">
            Letras
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/ons" class="nav-link" :class="{ active: route.name === 'ons' }">
            ONs
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/curvas" class="nav-link" :class="{ active: route.name === 'curvas' }">
            Curvas
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/compare" class="nav-link" :class="{ active: route.name === 'compare' }">
            Comparar
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/portfolios"
            class="nav-link"
            :class="{ active: route.name === 'portfolios' || route.name === 'portfolio' }"
          >
            Portafolio
          </RouterLink>
        </li>
      </ul>

      <!-- Controls -->
      <div class="nav-controls">
        <!-- Theme toggle -->
        <button
          class="control-btn theme-btn"
          :title="`Cambiar a modo ${themeStore.isDark() ? 'claro' : 'oscuro'}`"
          @click="themeStore.toggle()"
        >
          <span v-if="themeStore.isDark()">☀︎</span>
          <span v-else>◑</span>
        </button>

        <!-- User menu -->
        <template v-if="authStore.isAuthenticated">
          <img
            v-if="authStore.user?.avatarUrl"
            :src="authStore.user.avatarUrl"
            :alt="authStore.user.name ?? authStore.user.email"
            class="user-avatar"
            :title="authStore.user.email"
          />
          <button class="control-btn" title="Cerrar sesión" @click="handleLogout">↪</button>
        </template>
        <RouterLink v-else to="/login" class="control-btn login-btn">Ingresar</RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.nav-inner {
  display: flex;
  align-items: center;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 56px;
}

/* Logo */
.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.logo-mark {
  color: var(--color-accent);
  font-size: 0.9rem;
}

.logo-accent {
  color: var(--color-accent);
}

/* Nav links */
.nav-links {
  display: flex;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
}

.nav-link {
  display: block;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition:
    color var(--transition-base),
    background-color var(--transition-base);
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-text-primary);
  background-color: var(--color-bg-sunken);
}

.nav-link.active {
  color: var(--color-accent);
}

/* Controls */
.nav-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: 1rem;
}

.control-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: var(--color-accent-dim);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  object-fit: cover;
}

.login-btn {
  width: auto;
  padding: 0 0.75rem;
  font-size: 0.8rem;
  text-decoration: none;
}

@media (max-width: 640px) {
  .nav-inner {
    height: auto;
    flex-wrap: wrap;
    padding: 0;
    gap: 0;
  }

  .nav-logo {
    flex: 1;
    height: 48px;
    padding: 0 1rem;
  }

  .nav-controls {
    height: 48px;
    padding: 0 1rem;
  }

  .nav-links {
    order: 1;
    width: 100%;
    flex: none;
    overflow-x: auto;
    padding: 0.25rem 0.75rem 0.625rem;
    border-top: 1px solid var(--color-border-dim);
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .nav-links::-webkit-scrollbar {
    display: none;
  }
}
</style>
