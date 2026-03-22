<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CompareEntry } from '@investor-app/shared'
import type { Instrument } from '@investor-app/shared'
import { fetchCompare, fetchInstruments } from '@/services/api'
import { useCurrencyStore } from '@/stores/currencyStore'
import {
  formatYield,
  formatPrice,
  formatNumber,
  formatDate,
  formatTimeToMaturity,
} from '@/composables/useFormat'
import YieldCurveChart from '@/components/charts/YieldCurveChart.vue'
import CompareTable from '@/components/compare/CompareTable.vue'
import InstrumentSelector from '@/components/compare/InstrumentSelector.vue'

const currencyStore = useCurrencyStore()

// ── State ─────────────────────────────────────────────────────────────────────

const allInstruments = ref<Instrument[]>([])
const selectedTickers = ref<string[]>([])
const entries = ref<CompareEntry[]>([])
const failed = ref<string[]>([])
const loadingInstruments = ref(true)
const loadingCompare = ref(false)
const error = ref<string | null>(null)

// ── Load instrument list for the selector ─────────────────────────────────────

async function loadInstruments(): Promise<void> {
  try {
    allInstruments.value = await fetchInstruments()
  } catch {
    // Non-critical — selector will be empty but compare still works
  } finally {
    loadingInstruments.value = false
  }
}

loadInstruments()

// ── Run comparison whenever tickers or currency change ────────────────────────

async function runCompare(): Promise<void> {
  if (selectedTickers.value.length < 2) {
    entries.value = []
    return
  }

  loadingCompare.value = true
  error.value = null

  try {
    const result = await fetchCompare(selectedTickers.value, currencyStore.currency)
    entries.value = result.entries
    failed.value = result.failed ?? []
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Error al comparar instrumentos.'
  } finally {
    loadingCompare.value = false
  }
}

watch([selectedTickers, () => currencyStore.currency], runCompare, { deep: true })

// ── Selector helpers ──────────────────────────────────────────────────────────

function addTicker(ticker: string): void {
  if (selectedTickers.value.includes(ticker)) return
  if (selectedTickers.value.length >= 5) return
  selectedTickers.value = [...selectedTickers.value, ticker]
}

function removeTicker(ticker: string): void {
  selectedTickers.value = selectedTickers.value.filter((t) => t !== ticker)
}

const canAddMore = computed(() => selectedTickers.value.length < 5)
const hasResults = computed(() => entries.value.length > 0)
</script>

<template>
  <div class="compare-view">

    <!-- Header -->
    <header class="compare-header">
      <h1 class="compare-title font-display">Comparar instrumentos</h1>
      <p class="compare-subtitle">
        Seleccioná entre 2 y 5 instrumentos para comparar rendimientos, vencimientos y flujos de pago.
      </p>
    </header>

    <!-- Selector -->
    <InstrumentSelector
      :instruments="allInstruments"
      :selected="selectedTickers"
      :loading="loadingInstruments"
      :can-add-more="canAddMore"
      @add="addTicker"
      @remove="removeTicker"
    />

    <!-- Hint -->
    <div v-if="selectedTickers.length < 2 && selectedTickers.length > 0" class="hint">
      Agregá al menos un instrumento más para comparar.
    </div>
    <div v-else-if="selectedTickers.length === 0" class="hint">
      Buscá un instrumento arriba para empezar.
    </div>

    <!-- Loading compare -->
    <div v-if="loadingCompare" class="loading-compare">
      <div v-for="n in 3" :key="n" class="skeleton" style="height: 48px; border-radius: 0.5rem" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p class="font-mono" style="color: var(--color-negative)">ERROR</p>
      <p>{{ error }}</p>
    </div>

    <!-- Failed tickers warning -->
    <div v-if="failed.length > 0 && !loadingCompare" class="failed-warning">
      No se pudieron resolver:
      <span v-for="t in failed" :key="t" class="failed-ticker font-mono">{{ t }}</span>
    </div>

    <!-- Results -->
    <template v-if="hasResults && !loadingCompare">

      <!-- Yield curve chart -->
      <section class="result-section">
        <h2 class="section-title">Curva de rendimientos</h2>
        <p class="section-subtitle">TIR vs. tiempo al vencimiento</p>
        <div class="chart-wrapper card">
          <YieldCurveChart :entries="entries" />
        </div>
      </section>

      <!-- Compare table -->
      <section class="result-section">
        <h2 class="section-title">Tabla comparativa</h2>
        <CompareTable
          :entries="entries"
          :currency="currencyStore.currency"
        />
      </section>

    </template>

  </div>
</template>

<style scoped>
.compare-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 1rem;
}

.compare-header { padding-bottom: 0.5rem; }

.compare-title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 0.5rem;
}

.compare-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.hint {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px dashed var(--color-border);
}

.loading-compare {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.error-state {
  padding: 2rem 0;
  color: var(--color-text-secondary);
}

.failed-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
  color: var(--color-negative);
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.failed-ticker {
  font-weight: 600;
  font-size: 0.75rem;
}

.result-section {
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
</style>
