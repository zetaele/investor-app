<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNav from '@/components/ui/AppNav.vue'
import { useThemeStore } from '@/stores/themeStore'

// Initialize theme store on app mount — applies the stored/system theme
useThemeStore()
</script>

<template>
  <div class="app-shell">
    <AppNav />
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 3rem;
}

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
