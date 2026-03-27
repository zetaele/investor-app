<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { CompareEntry, InstrumentSubtype } from "@investor-app/shared";
import { fetchInstruments, fetchCompare } from "@/services/api";
import YieldCurveChart from "@/components/charts/YieldCurveChart.vue";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

interface CurveSection {
  title: string;
  subtitle: string;
  /** Filter by subtype (for ARS categories) */
  subtypes?: InstrumentSubtype[];
  /** Filter by instrument type (for ONs) */
  instrumentType?: string;
  entries: CompareEntry[];
  loading: boolean;
  error: string | null;
}

const sections = ref<CurveSection[]>([
  {
    title: "Bonos Soberanos USD",
    subtitle: "TIR vs. duration modificada — Ley Argentina y Ley Nueva York",
    subtypes: ["SOV_USD_ARG", "SOV_USD_EXT"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "LECAP y Bonos Capitalizables",
    subtitle: "TIR implícita vs. duration modificada — LECAP y BONCAP",
    subtypes: ["LECAP", "BONCAP"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Instrumentos CER",
    subtitle: "TIR real vs. duration modificada — LECER y Bonos CER",
    subtypes: ["LECER", "TASA_CER"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Obligaciones Negociables",
    subtitle: "TIR vs. duration modificada — deuda corporativa USD",
    instrumentType: "ON",
    entries: [],
    loading: true,
    error: null,
  },
]);

onMounted(async () => {
  try {
    const instruments = await fetchInstruments();

    const load = async (idx: number, section: CurveSection) => {
      const tickers = instruments
        .filter((i) => {
          if (section.subtypes) return section.subtypes.includes(i.subtype as InstrumentSubtype);
          if (section.instrumentType) return i.type === section.instrumentType;
          return false;
        })
        .map((i) => i.ticker);

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

    await Promise.all(sections.value.map((s, i) => load(i, s)));
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
        <div v-if="section.loading" class="chart-skeleton">
          <div class="skeleton" style="height: 260px; border-radius: 0.5rem" />
        </div>
        <ErrorBanner v-else-if="section.error" :message="section.error" />
        <div v-else-if="section.entries.length < 2" class="chart-empty">
          Se necesitan al menos 2 instrumentos para trazar la curva.
        </div>
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
