<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
</script>

<template>
  <div class="not-found">
    <span class="code font-mono">404</span>
    <h1 class="font-display">Página no encontrada</h1>
    <p>El instrumento o página que buscás no existe.</p>
    <button class="back-btn" @click="router.push('/')">← Volver al inicio</button>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1rem;
  text-align: center;
}

.code {
  font-size: 5rem;
  font-weight: 600;
  color: var(--color-border);
  line-height: 1;
}

h1 {
  font-size: 1.75rem;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
}

p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.back-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-base);
}

.back-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
