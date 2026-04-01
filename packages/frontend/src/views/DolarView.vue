<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { FxRates } from "@investor-app/shared";
import { fetchFxRates } from "@/services/api";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

const rates = ref<FxRates | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    rates.value = await fetchFxRates();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Error al cargar cotizaciones.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const CARDS = [
  { key: "official" as const, label: "Oficial",  desc: "Tipo de cambio regulado por el BCRA" },
  { key: "blue"     as const, label: "Blue",      desc: "Mercado informal / paralelo" },
  { key: "mep"      as const, label: "MEP",       desc: "Dólar bolsa — operado vía bonos en BYMA" },
  { key: "ccl"      as const, label: "CCL",       desc: "Contado con liquidación — operatoria offshore" },
];

function fmt(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="dolar-view">
    <header class="dolar-header">
      <h1 class="dolar-title font-display">Cotización del dólar</h1>
      <p class="dolar-subtitle">Precios de compra y venta en tiempo real. Fuente: dolarapi.com</p>
    </header>

    <div v-if="loading" class="cards-grid">
      <div v-for="n in 4" :key="n" class="rate-card card skeleton-card">
        <div class="skeleton" style="width: 60px; height: 13px; margin-bottom: 0.5rem" />
        <div class="skeleton" style="width: 110px; height: 32px; margin-bottom: 0.75rem" />
        <div class="skeleton" style="width: 140px; height: 13px" />
      </div>
    </div>

    <ErrorBanner v-else-if="error" :message="error" :on-retry="load" />

    <div v-else-if="rates" class="cards-grid">
      <div v-for="card in CARDS" :key="card.key" class="rate-card card">
        <p class="rate-label">{{ card.label }}</p>
        <p class="rate-sell font-mono">${{ fmt(rates[card.key].sell) }}</p>
        <div v-if="rates[card.key].buy !== rates[card.key].sell" class="rate-spread font-mono">
          <span class="spread-item">
            <span class="spread-tag">Compra</span>
            ${{ fmt(rates[card.key].buy) }}
          </span>
          <span class="spread-sep">·</span>
          <span class="spread-item">
            <span class="spread-tag">Venta</span>
            ${{ fmt(rates[card.key].sell) }}
          </span>
        </div>
        <p class="rate-desc">{{ card.desc }}</p>
      </div>
    </div>

    <p v-if="rates" class="updated-at">
      Actualizado {{ new Date(rates.official.fetchedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) }}
    </p>
  </div>
</template>

<style scoped>
.dolar-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 1rem;
}

.dolar-header {
  padding-bottom: 0.25rem;
}

.dolar-title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 0.5rem;
}

.dolar-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.rate-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.skeleton-card {
  min-height: 140px;
}

.rate-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  margin: 0;
}

.rate-sell {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  margin: 0.125rem 0 0.25rem;
}

.rate-spread {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.spread-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.spread-tag {
  font-size: 0.68rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.spread-sep {
  color: var(--color-border);
}

.rate-desc {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin: 0.375rem 0 0;
  line-height: 1.4;
}

.updated-at {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-text-dim);
  margin: 0;
}
</style>
