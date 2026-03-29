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
const quantity = ref<number | null>(null);
const settlementDate = ref<string>("");
const result = ref<SimulationResult | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// ── Computed ──────────────────────────────────────────────────────────────────

const inputLabel = computed(() => (mode.value === "price" ? "Precio limpio" : "TIR anual"));
const inputSuffix = computed(() => (mode.value === "price" ? props.displayCurrency : "%"));
const inputPlaceholder = computed(() => (mode.value === "price" ? "ej. 55.50" : "ej. 15.00"));

const ytmClass = computed(() => {
  const ytm = result.value?.calculations.ytm ?? 0;
  if (ytm > 0.15) return "num-positive";
  if (ytm > 0.08) return "num-neutral";
  return "num-negative";
});

// Filter out phantom cashflows (issue-date markers with zero flow)
const displayCashflows = computed(() =>
  result.value?.cashflows.filter((cf) => cf.coupon + cf.amortization > 0) ?? [],
);

const totalFlowPerUnit = computed(() =>
  displayCashflows.value.reduce((s, cf) => s + cf.coupon + cf.amortization, 0),
);

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
  const options = {
    quantity: quantity.value ?? undefined,
    settlementDate: settlementDate.value || undefined,
  };

  loading.value = true;
  try {
    result.value = await fetchSimulation(props.ticker, input, options);
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

    <!-- Inputs -->
    <div class="inputs-area">
      <!-- Price / YTM -->
      <div class="input-field">
        <label class="input-label" :for="`sim-input-${ticker}`">{{ inputLabel }}</label>
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
        </div>
      </div>

      <!-- Quantity -->
      <div class="input-field">
        <label class="input-label" :for="`sim-qty-${ticker}`">Cantidad (VN)</label>
        <div class="input-group">
          <input
            :id="`sim-qty-${ticker}`"
            v-model.number="quantity"
            class="sim-input font-mono"
            type="number"
            min="1"
            step="1"
            placeholder="ej. 10000"
            @keyup.enter="simulate"
          />
        </div>
      </div>

      <!-- Settlement date -->
      <div class="input-field">
        <label class="input-label" :for="`sim-date-${ticker}`">Fecha liquidación</label>
        <div class="input-group">
          <input
            :id="`sim-date-${ticker}`"
            v-model="settlementDate"
            class="sim-input date-input font-mono"
            type="date"
            @keyup.enter="simulate"
          />
        </div>
      </div>

      <!-- Button -->
      <div class="input-field btn-field">
        <button class="sim-btn" :disabled="loading" @click="simulate">
          <span v-if="loading" class="spinner" />
          <span v-else>Calcular</span>
        </button>
      </div>
    </div>

    <p v-if="error" class="sim-error">{{ error }}</p>

    <!-- Results -->
    <Transition name="fade">
      <div v-if="result" class="results-wrap">
        <!-- Metric cards -->
        <div class="results">
          <!-- Price → YTM mode: highlight TIR -->
          <template v-if="result.inputType === 'price'">
            <MetricCard
              label="TIR (YTM)"
              :value="formatYield(result.calculations.ytm)"
              :value-class="ytmClass"
              tooltip="Tasa Interna de Retorno anual a ese precio"
            />
            <MetricCard
              label="TNA"
              :value="result.calculations.tna ? formatYield(result.calculations.tna) : '-'"
              tooltip="Tasa Nominal Anual equivalente a la TIR según la frecuencia de pagos"
            />
            <MetricCard
              label="TEM"
              :value="result.calculations.tem ? formatYield(result.calculations.tem) : '-'"
              tooltip="Tasa Efectiva Mensual: (1+TIR)^(1/12) − 1"
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
              label="Current Yield"
              :value="
                result.calculations.currentYield
                  ? formatYield(result.calculations.currentYield)
                  : '-'
              "
              tooltip="Cupones del próximo año dividido el precio sucio"
            />
            <MetricCard
              label="Duration mod."
              :value="`${formatNumber(result.calculations.modifiedDuration)} años`"
              tooltip="Sensibilidad del precio ante variación de 1% en la tasa"
            />
            <MetricCard
              v-if="result.totalCost !== undefined"
              label="Costo total"
              :value="formatPrice(result.totalCost, displayCurrency)"
              tooltip="Costo de adquisición: cantidad × precio sucio / 100"
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
              label="TNA"
              :value="result.calculations.tna ? formatYield(result.calculations.tna) : '-'"
              tooltip="Tasa Nominal Anual equivalente a la TIR según la frecuencia de pagos"
            />
            <MetricCard
              label="TEM"
              :value="result.calculations.tem ? formatYield(result.calculations.tem) : '-'"
              tooltip="Tasa Efectiva Mensual: (1+TIR)^(1/12) − 1"
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
            <MetricCard
              v-if="result.totalCost !== undefined"
              label="Costo total"
              :value="formatPrice(result.totalCost, displayCurrency)"
              tooltip="Costo de adquisición: cantidad × precio sucio / 100"
            />
          </template>
        </div>

        <!-- Cashflow table -->
        <div class="cf-section">
          <h4 class="cf-title">Flujo de cobros</h4>
          <div class="cf-table-wrap">
            <table class="cf-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th class="num-col">Cupón</th>
                  <th class="num-col">Amort.</th>
                  <th class="num-col">Total / VN</th>
                  <th v-if="result.quantity" class="num-col">Total cobrado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cf in displayCashflows" :key="cf.paymentDate">
                  <td class="date-col font-mono">{{ cf.paymentDate.slice(0, 10) }}</td>
                  <td class="num-col font-mono">{{ formatNumber(cf.coupon) }}</td>
                  <td class="num-col font-mono">{{ formatNumber(cf.amortization) }}</td>
                  <td class="num-col font-mono">
                    {{ formatNumber(cf.coupon + cf.amortization) }}
                  </td>
                  <td v-if="result.quantity" class="num-col font-mono">
                    {{
                      formatPrice(
                        (result.quantity * (cf.coupon + cf.amortization)) / 100,
                        displayCurrency,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="total-label">Total</td>
                  <td class="num-col font-mono total-val">
                    {{ formatNumber(totalFlowPerUnit) }}
                  </td>
                  <td v-if="result.quantity" class="num-col font-mono total-val">
                    {{
                      formatPrice(
                        (result.quantity * totalFlowPerUnit) / 100,
                        displayCurrency,
                      )
                    }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
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

/* Inputs row */
.inputs-area {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.input-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.btn-field {
  justify-content: flex-end;
}

.input-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.input-group {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.sim-input {
  background: transparent;
  border: none;
  outline: none;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  width: 130px;
}
.sim-input.date-input {
  width: 150px;
  color-scheme: dark;
}
.sim-input::placeholder {
  color: var(--color-text-dim);
}
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
  padding: 0.6rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--color-accent);
  color: #000;
  border-radius: 0.5rem;
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
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-negative, #ef4444);
}

/* Results */
.results-wrap {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

/* Cashflow table */
.cf-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.cf-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-dim);
}

.cf-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.cf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.cf-table th,
.cf-table td {
  padding: 0.4rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.cf-table thead th {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
  background: var(--color-surface-alt, rgba(255, 255, 255, 0.02));
}

.cf-table tbody tr:last-child td {
  border-bottom: none;
}

.cf-table tfoot td {
  border-top: 1px solid var(--color-border);
  border-bottom: none;
  font-weight: 600;
}

.num-col {
  text-align: right;
}

.date-col {
  color: var(--color-text-secondary);
}

.total-label {
  color: var(--color-text-dim);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.total-val {
  color: var(--color-text-primary);
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
