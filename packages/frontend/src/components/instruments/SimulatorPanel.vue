<script setup lang="ts">
import { ref, computed } from "vue";
import type { Currency, SimulationResult } from "@investor-app/shared";
import { fetchSimulation } from "@/services/api";
import { formatYield, formatPrice, formatNumber } from "@/composables/useFormat";
import MetricCard from "./MetricCard.vue";

const props = defineProps<{
  ticker: string;
  displayCurrency: Currency;
}>();

// ── State ─────────────────────────────────────────────────────────────────────

type Mode = "price" | "ytm";
const mode = ref<Mode>("price");
const inputRaw = ref<number | null>(null);
const result = ref<SimulationResult | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// ── Computed ──────────────────────────────────────────────────────────────────

const inputLabel = computed(() => (mode.value === "price" ? "Precio sucio" : "TIR anual"));

const inputSuffix = computed(() => (mode.value === "price" ? props.displayCurrency : "%"));

const inputPlaceholder = computed(() => (mode.value === "price" ? "ej. 55.50" : "ej. 15.00"));

const ytmClass = computed(() => {
  const ytm = result.value?.calculations.ytm ?? 0;
  if (ytm > 0.15) return "num-positive";
  if (ytm > 0.08) return "num-neutral";
  return "num-negative";
});

// ── Actions ───────────────────────────────────────────────────────────────────

function switchMode(next: Mode): void {
  mode.value = next;
  inputRaw.value = null;
  result.value = null;
  error.value = null;
}

async function simulate(): Promise<void> {
  error.value = null;
  const raw = inputRaw.value;

  if (raw === null || isNaN(raw) || raw <= 0) {
    error.value = "Ingresá un valor válido mayor a 0.";
    return;
  }

  // For YTM input: user types in percentage (e.g. "15"), we convert to decimal
  const input = mode.value === "price" ? { price: raw } : { ytm: raw / 100 };

  loading.value = true;
  try {
    result.value = await fetchSimulation(props.ticker, input, props.displayCurrency);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Error al simular.";
    result.value = null;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="simulator">
    <!-- Mode toggle -->
    <div class="mode-toggle" role="group" aria-label="Modo de simulación">
      <button class="toggle-btn" :class="{ active: mode === 'price' }" @click="switchMode('price')">
        Precio → TIR
      </button>
      <button class="toggle-btn" :class="{ active: mode === 'ytm' }" @click="switchMode('ytm')">
        TIR → Precio
      </button>
    </div>

    <!-- Input row -->
    <div class="input-row">
      <label class="input-label" :for="`sim-input-${ticker}`">
        {{ inputLabel }}
      </label>
      <div class="input-group">
        <input
          :id="`sim-input-${ticker}`"
          v-model.number="inputRaw"
          class="sim-input font-mono"
          type="number"
          min="0"
          step="0.01"
          :placeholder="inputPlaceholder"
          @keyup.enter="simulate"
        />
        <span class="input-suffix font-mono">{{ inputSuffix }}</span>
        <button class="sim-btn" :disabled="loading" @click="simulate">
          <span v-if="loading" class="spinner" />
          <span v-else>Calcular</span>
        </button>
      </div>
      <p v-if="error" class="sim-error">{{ error }}</p>
    </div>

    <!-- Results -->
    <Transition name="fade">
      <div v-if="result" class="results">
        <!-- Price → YTM mode: highlight TIR -->
        <template v-if="result.inputType === 'price'">
          <MetricCard
            label="TIR (YTM)"
            :value="formatYield(result.calculations.ytm)"
            :value-class="ytmClass"
            tooltip="Tasa Interna de Retorno anual a ese precio"
          />
          <MetricCard
            label="Precio limpio"
            :value="formatPrice(result.calculations.cleanPrice, displayCurrency)"
            tooltip="Precio sin el interés corrido"
          />
          <MetricCard
            label="Interés corrido"
            :value="formatPrice(result.calculations.accruedInterest, displayCurrency)"
            tooltip="Cupón devengado hasta la fecha de liquidación"
          />
          <MetricCard
            label="Duration mod."
            :value="`${formatNumber(result.calculations.modifiedDuration)} años`"
            tooltip="Sensibilidad del precio ante variación de 1% en la tasa"
          />
        </template>

        <!-- YTM → Price mode: highlight precio -->
        <template v-else>
          <MetricCard
            label="Precio sucio"
            :value="formatPrice(result.calculations.dirtyPrice, displayCurrency)"
            tooltip="Precio teórico a esa TIR (incluye interés corrido)"
          />
          <MetricCard
            label="Precio limpio"
            :value="formatPrice(result.calculations.cleanPrice, displayCurrency)"
            tooltip="Precio sin el interés corrido"
          />
          <MetricCard
            label="Paridad"
            :value="formatYield(result.calculations.parityPct)"
            tooltip="Precio como porcentaje del valor nominal"
          />
          <MetricCard
            label="Duration mod."
            :value="`${formatNumber(result.calculations.modifiedDuration)} años`"
            tooltip="Sensibilidad del precio ante variación de 1% en la tasa"
          />
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.simulator {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Mode toggle */
.mode-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
  width: fit-content;
}

.toggle-btn {
  all: unset;
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition:
    background var(--transition-base),
    color var(--transition-base);
}
.toggle-btn:hover:not(.active) {
  background: var(--color-surface-hover, rgba(255, 255, 255, 0.04));
}
.toggle-btn.active {
  background: var(--color-accent);
  color: #000;
}

/* Input */
.input-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 0.375rem;
}

.input-group {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
  max-width: 340px;
}

.sim-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
  color: var(--color-text-primary);
  min-width: 0;
}
.sim-input::placeholder {
  color: var(--color-text-dim);
}
/* hide number arrows */
.sim-input::-webkit-inner-spin-button,
.sim-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.sim-input[type="number"] {
  -moz-appearance: textfield;
}

.input-suffix {
  display: flex;
  align-items: center;
  padding: 0 0.625rem;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  border-left: 1px solid var(--color-border);
  background: var(--color-surface-alt, rgba(255, 255, 255, 0.03));
  user-select: none;
}

.sim-btn {
  all: unset;
  padding: 0 1.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-accent);
  color: #000;
  transition: opacity var(--transition-base);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}
.sim-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sim-error {
  margin: 0.375rem 0 0;
  font-size: 0.78rem;
  color: var(--color-negative, #ef4444);
}

/* Results grid */
.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
