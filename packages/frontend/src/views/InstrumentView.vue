<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { InstrumentAnalysis } from "@investor-app/shared";
import { fetchAnalysis } from "@/services/api";
import {
  formatYield,
  formatPrice,
  formatNumber,
  formatDate,
  formatTimeToMaturity,
} from "@/composables/useFormat";
import CashflowChart from "@/components/charts/CashflowChart.vue";
import CashflowTable from "@/components/instruments/CashflowTable.vue";
import MetricCard from "@/components/instruments/MetricCard.vue";
import SimulatorPanel from "@/components/instruments/SimulatorPanel.vue";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

const props = defineProps<{ ticker: string }>();
const router = useRouter();

const analysis = ref<InstrumentAnalysis | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    analysis.value = await fetchAnalysis(props.ticker);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : "Error al cargar el instrumento.";
  } finally {
    loading.value = false;
  }
}

watch(() => props.ticker, load);
onMounted(load);

const TYPE_LABELS: Record<string, string> = {
  BOND: "Bono",
  LETTER: "Letra",
  ON: "Obligación Negociable",
};

const ytmClass = computed(() => {
  const ytm = analysis.value?.calculations.ytm ?? 0;
  if (ytm > 0.15) return "num-positive";
  if (ytm > 0.08) return "num-neutral";
  return "num-negative";
});
</script>

<template>
  <div class="instrument-view">
    <button class="back-btn" @click="router.back()">← Volver</button>

    <!-- Loading -->
    <template v-if="loading">
      <div class="header-skeleton">
        <div class="skeleton" style="height: 2.5rem; width: 160px" />
        <div class="skeleton" style="height: 1rem; width: 320px; margin-top: 0.75rem" />
      </div>
      <div class="metrics-grid">
        <div v-for="n in 6" :key="n" class="skeleton metric-skeleton" />
      </div>
    </template>

    <!-- Error -->
    <ErrorBanner v-else-if="error" :message="error" :on-retry="load" />

    <!-- Content -->
    <template v-else-if="analysis">
      <!-- Header -->
      <header class="instrument-header">
        <div class="header-left">
          <div class="header-top">
            <h1 class="ticker font-mono">{{ analysis.ticker }}</h1>
            <span class="type-badge" :data-type="analysis.type">
              {{ TYPE_LABELS[analysis.type] ?? analysis.type }}
            </span>
            <span class="currency-badge font-mono">{{ analysis.currency }}</span>
          </div>
          <p class="instrument-name">{{ analysis.name }}</p>
          <p class="instrument-meta">
            <span>Vence {{ formatDate(analysis.maturityDate) }}</span>
            <span class="meta-sep">·</span>
            <span class="font-mono" style="color: var(--color-accent)">
              {{ formatTimeToMaturity(analysis.maturityDate) }}
            </span>
            <span class="meta-sep">·</span>
            <span>{{ analysis.market.currency }} · BYMA</span>
          </p>
        </div>

        <div class="header-price">
          <p class="price-label">Precio de mercado</p>
          <p class="price-value font-mono num-reveal">
            {{ formatPrice(analysis.market.price, analysis.market.currency) }}
          </p>
          <p class="price-updated">
            Actualizado
            {{
              new Date(analysis.market.fetchedAt).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }}
          </p>
        </div>
      </header>

      <!-- YTW disclaimer for dual bonds -->
      <div v-if="analysis.subtype === 'DUAL'" class="ytw-banner">
        <strong>Rendimiento calculado bajo criterio Yield to Worst (YTW):</strong>
        refleja el mínimo rendimiento posible para este instrumento. El monto a pagar al
        vencimiento será el mayor entre la <strong>tasa fija capitalizable</strong>
        (pata CAP) y la <strong>TAMAR acumulada</strong> durante la vida del bono (pata variable).
        La TIR mostrada corresponde a la pata CAP.
      </div>

      <!-- Key metrics -->
      <section class="metrics-section">
        <h2 class="section-title">Métricas clave</h2>
        <div class="metrics-grid">
          <MetricCard
            label="TIR (YTM)"
            :value="formatYield(analysis.calculations.ytm)"
            :value-class="ytmClass"
            tooltip="Tasa Interna de Retorno anual si se mantiene el bono hasta el vencimiento"
          />
          <MetricCard
            label="Precio limpio"
            :value="formatPrice(analysis.calculations.cleanPrice, analysis.displayCurrency)"
            tooltip="Precio sin el interés corrido acumulado"
          />
          <MetricCard
            label="Precio sucio"
            :value="formatPrice(analysis.calculations.dirtyPrice, analysis.displayCurrency)"
            tooltip="Precio que efectivamente paga el comprador (incluye interés corrido)"
          />
          <MetricCard
            label="Interés corrido"
            :value="formatPrice(analysis.calculations.accruedInterest, analysis.displayCurrency)"
            tooltip="Cupón devengado desde el último pago de intereses"
          />
          <MetricCard
            label="Duration mod."
            :value="`${formatNumber(analysis.calculations.modifiedDuration)} años`"
            tooltip="Sensibilidad del precio ante una variación de 1% en la tasa de interés"
          />
          <MetricCard
            label="Paridad"
            :value="formatYield(analysis.calculations.parityPct)"
            :tooltip="analysis.subtype === 'DUAL'
              ? 'Precio como porcentaje del Valor Técnico de la pata CAP (precio / VT_CAP)'
              : 'Precio actual como porcentaje del valor nominal (100 = par)'"
          />
          <MetricCard
            label="TNA"
            :value="analysis.calculations.tna ? formatYield(analysis.calculations.tna) : '-'"
            tooltip="Tasa Nominal Anual equivalente a la TIR según la frecuencia de pagos"
          />
          <MetricCard
            label="Current Yield"
            :value="
              analysis.calculations.currentYield
                ? formatYield(analysis.calculations.currentYield)
                : '-'
            "
            tooltip="Cupones del próximo año dividido el precio sucio"
          />
        </div>
      </section>

      <!-- Simulator -->
      <section class="simulator-section">
        <h2 class="section-title">Simulador</h2>
        <p class="section-subtitle">
          Ingresá un precio para calcular la TIR, o una TIR para calcular el precio teórico
        </p>
        <div class="card simulator-card">
          <SimulatorPanel :ticker="analysis.ticker" :display-currency="analysis.displayCurrency" />
        </div>
      </section>

      <!-- Cashflow chart -->
      <section class="chart-section">
        <h2 class="section-title">Flujo de pagos</h2>
        <p class="section-subtitle">Cupones y amortizaciones programados hasta el vencimiento</p>
        <div class="chart-wrapper card">
          <CashflowChart :cashflows="analysis.cashflows" :currency="analysis.displayCurrency" />
        </div>
      </section>

      <!-- Cashflow table -->
      <section class="table-section">
        <h2 class="section-title">Detalle de flujos</h2>
        <CashflowTable :cashflows="analysis.cashflows" :currency="analysis.displayCurrency" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.instrument-view {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding-top: 1rem;
}

.ytw-banner {
  padding: 0.875rem 1.25rem;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-warning, #f59e0b) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-warning, #f59e0b) 40%, transparent);
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-text);
}

.back-btn {
  all: unset;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-base);
}
.back-btn:hover {
  color: var(--color-accent);
}

.header-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem 0;
}

.instrument-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
}

.header-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.ticker {
  font-size: 2.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-text-primary);
  margin: 0;
}

.type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.625rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
}
.type-badge[data-type="BOND"] {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}
.type-badge[data-type="LETTER"] {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}
.type-badge[data-type="ON"] {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.currency-badge {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.625rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
}

.instrument-name {
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin: 0.5rem 0 0;
}

.instrument-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin: 0.375rem 0 0;
  flex-wrap: wrap;
}
.meta-sep {
  color: var(--color-border);
}

.header-price {
  text-align: right;
  flex-shrink: 0;
}
.price-label {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  margin: 0 0 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.price-value {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}
.price-updated {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  margin: 0.25rem 0 0;
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem;
}
.section-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem;
}

.metrics-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.metric-skeleton {
  height: 90px;
  border-radius: 0.75rem;
}

.simulator-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.simulator-card {
  padding: 1.5rem;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.chart-wrapper {
  padding: 1.5rem;
}

.table-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.error-state {
  padding: 3rem 0;
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .instrument-view {
    gap: 1.75rem;
  }

  .ticker {
    font-size: 1.75rem;
  }

  .header-price {
    text-align: left;
  }

  .price-value {
    font-size: 1.875rem;
  }

  .simulator-card,
  .chart-wrapper {
    padding: 1rem;
  }
}
</style>
