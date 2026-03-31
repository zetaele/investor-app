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
  failed?: string[];
  estimated?: string[];
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
    title: "BOPREAL",
    subtitle: "TIR vs. duration modificada — Bonos para la Reconstrucción de una Argentina Libre",
    subtypes: ["BOPREAL"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Sub-soberanos USD",
    subtitle: "TIR vs. duration modificada — deuda provincial tasa fija en dólares",
    subtypes: ["SUBSOBERANO_FIJA_USD"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Sub-soberanos Tasa Flotante ARS",
    subtitle: "TIR vs. duration modificada — deuda provincial tasa flotante en pesos",
    subtypes: ["SUBSOBERANO_FLOTANTE"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Bonos CER",
    subtitle: "TIR real vs. duration modificada — bonos soberanos ajustables por CER",
    subtypes: ["TASA_CER"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Bonos Tasa Fija ARS",
    subtitle: "TIR vs. duration modificada — bonos soberanos ARS tasa fija",
    subtypes: ["TASA_FIJA_ARS"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Bonos Tasa Flotante ARS",
    subtitle: "TIR vs. duration modificada — bonos soberanos ARS tasa flotante",
    subtypes: ["TASA_FLOTANTE"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Bonos Duales",
    subtitle: "TIR vs. duration modificada — bonos soberanos duales (LECAP + TAMAR)",
    subtypes: ["DUAL"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "BONCAP",
    subtitle: "TIR implícita vs. duration modificada — bonos de capitalización ARS",
    subtypes: ["BONCAP"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "LECAP",
    subtitle: "TIR implícita vs. duration modificada — letras de capitalización ARS",
    subtypes: ["LECAP"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Letras CER (LECER)",
    subtitle: "TIR real vs. duration modificada — letras ajustables por CER",
    subtypes: ["LECER"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "TAMAR",
    subtitle: "TIR vs. duration modificada — letras y bonos TAMAR",
    subtypes: ["TAMAR"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Letras Dollar-Linked (LELINK)",
    subtitle: "TIR vs. duration modificada — letras ajustables por tipo de cambio",
    subtypes: ["LELINK"],
    entries: [],
    loading: true,
    error: null,
  },
  {
    title: "Obligaciones Negociables",
    subtitle: "TIR vs. duration modificada — deuda corporativa",
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
        const { entries, failed, estimated } = await fetchCompare(tickers);
        sections.value[idx]!.entries = entries;
        if (failed && failed.length > 0) sections.value[idx]!.failed = failed;
        if (estimated && estimated.length > 0) sections.value[idx]!.estimated = estimated;
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

    <section
      v-for="(section, i) in sections"
      :key="i"
      v-show="section.loading || section.error || section.entries.length >= 2"
      class="curve-section"
    >
      <h2 class="section-title">{{ section.title }}</h2>
      <p class="section-subtitle">{{ section.subtitle }}</p>

      <div class="chart-wrapper card">
        <div v-if="section.loading" class="chart-skeleton">
          <div class="skeleton" style="height: 260px; border-radius: 0.5rem" />
        </div>
        <ErrorBanner v-else-if="section.error" :message="section.error" />
        <template v-else>
          <YieldCurveChart :entries="section.entries" />
          <p v-if="section.estimated && section.estimated.length > 0" class="stale-warning">
            ⚠ Precio estimativo: {{ section.estimated.join(", ") }}. Sin datos en tiempo real, puede no reflejar la realidad del mercado.
          </p>
        </template>
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

.stale-warning {
  margin: 0.5rem 0.5rem 0;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--color-text-dim);
  opacity: 0.75;
}
</style>
