<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { usePortfolioStore } from "@/stores/portfolioStore";

const router = useRouter();
const store = usePortfolioStore();
const newName = ref("Mi portafolio");
const creating = ref(false);

onMounted(async () => {
  await store.loadPortfolios();
  // Auto-navigate if user already has portfolios
  if (store.portfolios.length === 1 && store.portfolios[0]) {
    router.replace({ name: "portfolio", params: { id: store.portfolios[0].id } });
  }
});

async function handleCreate(): Promise<void> {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const p = await store.create(newName.value.trim());
    router.push({ name: "portfolio", params: { id: p.id } });
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <main class="page">
    <div class="page-inner">
      <header class="page-header">
        <h1 class="page-title">Mis Portafolios</h1>
      </header>

      <!-- Loading -->
      <div v-if="store.loading" class="state-msg">Cargando...</div>

      <!-- Error -->
      <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>

      <!-- Has portfolios -->
      <template v-else-if="store.portfolios.length > 0">
        <ul class="portfolio-list">
          <li
            v-for="p in store.portfolios"
            :key="p.id"
            class="portfolio-card card"
            @click="router.push({ name: 'portfolio', params: { id: p.id } })"
          >
            <span class="portfolio-name">{{ p.name }}</span>
            <span class="portfolio-meta">{{ p.holdingCount }} instrumento{{ p.holdingCount !== 1 ? 's' : '' }}</span>
          </li>
        </ul>
      </template>

      <!-- Empty state: create first portfolio -->
      <div v-else class="empty-state card">
        <p class="empty-msg">Todavía no tenés ningún portafolio.</p>
        <div class="create-form">
          <input
            v-model="newName"
            class="name-input font-mono"
            type="text"
            maxlength="50"
            placeholder="Nombre del portafolio"
            @keyup.enter="handleCreate"
          />
          <button class="create-btn" :disabled="creating" @click="handleCreate">
            {{ creating ? "Creando..." : "Crear portafolio" }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding: 2rem 1.5rem;
}
.page-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.page-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}
.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}
.state-msg {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
.state-msg.error {
  color: var(--color-negative, #ef4444);
}
.portfolio-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.portfolio-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: border-color var(--transition-base);
}
.portfolio-card:hover {
  border-color: var(--color-accent);
}
.portfolio-name {
  font-weight: 600;
}
.portfolio-meta {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}
.empty-state {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: flex-start;
}
.empty-msg {
  margin: 0;
  color: var(--color-text-secondary);
}
.create-form {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}
.name-input {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text-primary);
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  outline: none;
  width: 240px;
}
.name-input:focus {
  border-color: var(--color-accent);
}
.create-btn {
  all: unset;
  padding: 0.5rem 1.25rem;
  background: var(--color-accent);
  color: #000;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.create-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
