<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { fetchCalendar } from "@/services/api";
import type { CalendarMonth } from "@/services/api";
import { formatDate, formatNumber } from "@/composables/useFormat";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

const router = useRouter();
const months = ref<CalendarMonth[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const daysAhead = ref(730);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    months.value = await fetchCalendar(daysAhead.value);
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : "Error al cargar el calendario.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const TYPE_LABELS: Record<string, string> = {
  BOND: "Bono",
  LETTER: "Letra",
  ON: "ON",
};

const HORIZON_OPTIONS = [
  { label: "6 meses", days: 180 },
  { label: "1 año", days: 365 },
  { label: "2 años", days: 730 },
  { label: "5 años", days: 1825 },
];

function setHorizon(days: number): void {
  daysAhead.value = days;
  load();
}
</script>

<template>
  <div class="calendar-view">
    <!-- Header -->
    <header class="calendar-header">
      <div>
        <h1 class="calendar-title font-display">Calendario de pagos</h1>
        <p class="calendar-subtitle">
          Próximos cupones y amortizaciones de todos los instrumentos activos.
        </p>
      </div>

      <!-- Horizon filter -->
      <div class="horizon-filters">
        <button
          v-for="opt in HORIZON_OPTIONS"
          :key="opt.days"
          class="horizon-btn"
          :class="{ active: daysAhead === opt.days }"
          @click="setHorizon(opt.days)"
        >
          {{ opt.label }}
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="months-list">
      <div v-for="n in 3" :key="n" class="month-block">
        <div
          class="skeleton"
          style="height: 1.25rem; width: 140px; margin-bottom: 1rem"
        />
        <div
          class="skeleton"
          style="height: 48px; border-radius: 0.5rem; margin-bottom: 0.5rem"
        />
        <div class="skeleton" style="height: 48px; border-radius: 0.5rem" />
      </div>
    </div>

    <!-- Error -->
    <ErrorBanner v-else-if="error" :message="error" :on-retry="load" />

    <!-- Empty -->
    <div v-else-if="months.length === 0" class="empty-state">
      <p>No hay pagos programados en el período seleccionado.</p>
    </div>

    <!-- Calendar -->
    <div v-else class="months-list">
      <div v-for="month in months" :key="month.month" class="month-block">
        <!-- Month header -->
        <div class="month-header">
          <h2 class="month-label">{{ month.label }}</h2>
          <span class="month-count font-mono">
            {{ month.payments.length }} pago{{
              month.payments.length !== 1 ? "s" : ""
            }}
          </span>
        </div>

        <!-- Payments -->
        <div class="payments-list">
          <button
            v-for="payment in month.payments"
            :key="`${payment.ticker}-${payment.paymentDate}`"
            class="payment-row"
            @click="router.push(`/instrument/${payment.ticker}`)"
          >
            <!-- Left: date + ticker -->
            <div class="payment-left">
              <span class="payment-date font-mono">
                {{ formatDate(payment.paymentDate) }}
              </span>
              <div class="payment-instrument">
                <span class="payment-ticker font-mono">{{
                  payment.ticker
                }}</span>
                <span class="payment-type" :data-type="payment.instrumentType">
                  {{
                    TYPE_LABELS[payment.instrumentType] ??
                    payment.instrumentType
                  }}
                </span>
              </div>
            </div>

            <!-- Center: coupon + amortization -->
            <div class="payment-flows">
              <span v-if="payment.coupon > 0" class="flow-item coupon">
                <span class="flow-label">Cupón</span>
                <span class="flow-value font-mono">
                  {{ payment.currency }} {{ formatNumber(payment.coupon, 4) }}
                </span>
              </span>
              <span
                v-if="payment.amortization > 0"
                class="flow-item amortization"
              >
                <span class="flow-label">Amort.</span>
                <span class="flow-value font-mono">
                  {{ payment.currency }}
                  {{ formatNumber(payment.amortization, 2) }}
                </span>
              </span>
            </div>

            <!-- Right: total flow -->
            <div class="payment-right">
              <span class="total-label">Total</span>
              <span class="total-value font-mono">
                {{ payment.currency }} {{ formatNumber(payment.totalFlow, 4) }}
              </span>
              <span v-if="payment.amortization > 0" class="amort-badge">
                {{ payment.residualAfter === 0 ? "Vencimiento" : "Amortiza" }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 1rem;
}

/* Header */
.calendar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
}

.calendar-title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 0.375rem;
}

.calendar-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

/* Horizon filter */
.horizon-filters {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.horizon-btn {
  padding: 0.375rem 0.875rem;
  border-radius: 2rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.horizon-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.horizon-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #000;
}

/* Months list */
.months-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Month block */
.month-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.month-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.month-label {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
  text-transform: capitalize;
}

.month-count {
  font-size: 0.72rem;
  color: var(--color-text-dim);
  letter-spacing: 0.04em;
}

/* Payment rows */
.payments-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.payment-row {
  all: unset;
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-radius: 0.625rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-dim);
  cursor: pointer;
  transition:
    border-color var(--transition-base),
    background var(--transition-base);
  box-sizing: border-box;
  width: 100%;
  text-align: left;
}

.payment-row:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-sunken);
}

/* Left */
.payment-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.payment-date {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  letter-spacing: 0.02em;
}

.payment-instrument {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-ticker {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.04em;
}

.payment-type {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  padding: 0.15rem 0.4rem;
  border-radius: 0.2rem;
  text-transform: uppercase;
}

.payment-type[data-type="BOND"] {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}
.payment-type[data-type="LETTER"] {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}
.payment-type[data-type="ON"] {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

/* Center */
.payment-flows {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.flow-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.flow-label {
  font-size: 0.68rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: 40px;
  flex-shrink: 0;
}

.flow-value {
  font-size: 0.82rem;
  font-weight: 500;
}

.flow-item.coupon .flow-value {
  color: var(--color-accent);
}
.flow-item.amortization .flow-value {
  color: var(--color-positive);
}

/* Right */
.payment-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.total-label {
  font-size: 0.65rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.total-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.amort-badge {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.4rem;
  border-radius: 0.2rem;
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-positive);
  text-transform: uppercase;
}

/* States */
.error-state,
.empty-state {
  padding: 3rem 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .payment-row {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.75rem 1rem;
  }

  .payment-flows {
    grid-column: 1 / -1;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}
</style>
