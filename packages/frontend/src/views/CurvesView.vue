<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { CompareEntry } from "@investor-app/shared";
import { fetchInstruments, fetchCompare } from "@/services/api";
import YieldCurveChart from "@/components/charts/YieldCurveChart.vue";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

interface CurveSection {
  title: string;
  subtitle: string;
  entries: CompareEntry[];
  loading: boolean;
  error: string | null;
}

const sections = ref<CurveSection[]>([
  {
    title: "Bonos",
    subtitle: "TIR vs. duration modificada — Ley Argentina y Nueva York",
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Letras del Tesoro",
    subtitle: "TIR vs. duration modificada — instrumentos de descuento en ARS",
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Obligaciones negociables",
    subtitle: "TIR vs. duration modificada — deuda corporativa USD",
    entries: [],
    loading: true,
    error: null,
  },
]);

onMounted(async () => {
  try {
    const instruments = await fetchInstruments();
    const byType = {
      BOND: instruments.filter((i) => i.type === "BOND").map((i) => i.ticker),
      LETTER: instruments.filter((i) => i.type === "LETTER").map((i) => i.ticker),
      ON: instruments.filter((i) => i.type === "ON").map((i) => i.ticker),
    };

    const load = async (idx: number, tickers: string[]) => {
      if (tickers.length < 2) {
        sections.value[idx]!.loading = false;
        return;
      }
      try {
        const { entries } = await fetchCompare(tickers);
        sections.value[idx]!.entries = entries;
      } catch (err) {
        sections.value[idx]!.error = err instanceof Error ? err.message : "Error al cargar curva.";
      } finally {
        sections.value[idx]!.loading = false;
      }
    };

    await Promise.all([load(0, byType.BOND), load(1, byType.LETTER), load(2, byType.ON)]);
  } catch {
    sections.value.forEach((s) => {
      s.loading = false;
      s.error = "Error al cargar instrumentos.";
    });
  }
});
</script>

<template>
  <div class="curves-view">
    <header class="curves-header">
      <h1 class="curves-title font-display">Curvas de rendimiento</h1>
      <p class="curves-subtitle">
        Curvas ajustadas por regresión cuadrática sobre datos de mercado en tiempo real.
      </p>
    </header>

    <section v-for="(section, i) in sections" :key="i" class="curve-section">
      <h2 class="section-title">{{ section.title }}</h2>
      <p class="section-subtitle">{{ section.subtitle }}</p>

      <div class="chart-wrapper card">
        <!-- Loading -->
        <div v-if="section.loading" class="chart-skeleton">
          <div class="skeleton" style="height: 260px; border-radius: 0.5rem" />
        </div>

        <!-- Error -->
        <ErrorBanner v-else-if="section.error" :message="section.error" />

        <!-- Not enough data -->
        <div v-else-if="section.entries.length < 2" class="chart-empty">
          Se necesitan al menos 2 instrumentos para trazar la curva.
        </div>

        <!-- Chart -->
        <YieldCurveChart v-else :entries="section.entries" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.curves-view {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding-top: 1rem;
}

.curves-header {
  padding-bottom: 0.5rem;
}

.curves-title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 0.5rem;
}

.curves-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.curve-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
}

.section-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.chart-wrapper {
  padding: 1.5rem;
}

.chart-empty {
  text-align: center;
  padding: 3rem 1rem;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}
</style>
