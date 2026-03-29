<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import type { Currency } from "@investor-app/shared";
import { usePortfolioStore } from "@/stores/portfolioStore";
import { formatPrice, formatYield, formatNumber } from "@/composables/useFormat";
import { ApiError } from "@/services/api";

const props = defineProps<{ id: string }>();
const router = useRouter();
const store = usePortfolioStore();

const portfolioId = computed(() => Number(props.id));

// ── Add instrument form ────────────────────────────────────────────────────────
const showAddForm = ref(false);
const addTicker = ref("");
const addQuantity = ref<number | null>(null);
const addPrice = ref<number | null>(null);
const addLoading = ref(false);
const addError = ref<string | null>(null);

// ── Calendar tab ──────────────────────────────────────────────────────────────
const activeTab = ref<"holdings" | "calendar">("holdings");

// ── Totals by currency ────────────────────────────────────────────────────────
const totalsByCurrency = computed(() => {
  const holdings = store.current?.holdings ?? [];
  const map: Record<string, number> = {};
  for (const h of holdings) {
    const key = h.currency === "ARS" ? "ARS" : "USD";
    map[key] = (map[key] ?? 0) + h.currentValue;
  }
  return Object.entries(map).map(([currency, total]) => ({ currency: currency as Currency, total }));
});

onMounted(async () => {
  await store.loadDetail(portfolioId.value);
});

async function switchTab(tab: "holdings" | "calendar"): Promise<void> {
  activeTab.value = tab;
  if (tab === "calendar" && store.calendar.length === 0) {
    await store.loadCalendar(portfolioId.value);
  }
}

async function handleAdd(): Promise<void> {
  addError.value = null;
  const ticker = addTicker.value.trim().toUpperCase();
  const qty = addQuantity.value;
  if (!ticker || !qty || qty <= 0) {
    addError.value = "Ticker y cantidad son obligatorios.";
    return;
  }
  addLoading.value = true;
  try {
    await store.addInstrument(
      portfolioId.value,
      ticker,
      qty,
      addPrice.value ?? undefined,
    );
    addTicker.value = "";
    addQuantity.value = null;
    addPrice.value = null;
    showAddForm.value = false;
  } catch (e) {
    addError.value =
      e instanceof ApiError ? e.message : "Error al agregar instrumento.";
  } finally {
    addLoading.value = false;
  }
}

async function handleRemove(ticker: string): Promise<void> {
  if (!confirm(`¿Eliminar ${ticker} del portafolio?`)) return;
  await store.removeInstrument(portfolioId.value, ticker);
}
</script>

<template>
  <main class="page">
    <div class="page-inner">
      <!-- Header -->
      <header class="page-header">
        <button class="back-btn" @click="router.push({ name: 'portfolios' })">← Portafolios</button>
        <h1 class="page-title">{{ store.current?.name ?? "Portafolio" }}</h1>
      </header>

      <div v-if="store.loading && !store.current" class="state-msg">Cargando...</div>
      <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>

      <template v-else-if="store.current">
        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'holdings' }"
            @click="switchTab('holdings')"
          >
            Holdings
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'calendar' }"
            @click="switchTab('calendar')"
          >
            Calendario de cobros
          </button>
        </div>

        <!-- ── Holdings tab ─────────────────────────────────────────────────── -->
        <template v-if="activeTab === 'holdings'">
          <!-- Totals -->
          <div v-if="totalsByCurrency.length > 0" class="totals-row">
            <div v-for="t in totalsByCurrency" :key="t.currency" class="total-chip card">
              <span class="total-label">Valor total {{ t.currency }}</span>
              <span class="total-value font-mono">{{ formatPrice(t.total, t.currency) }}</span>
            </div>
          </div>

          <!-- Holdings table -->
          <div v-if="store.current.holdings.length > 0" class="table-wrap card">
            <table class="holdings-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Nombre</th>
                  <th class="num-col">Cantidad (VN)</th>
                  <th class="num-col">Precio costo</th>
                  <th class="num-col">Precio actual</th>
                  <th class="num-col">Valor</th>
                  <th class="num-col">YTM</th>
                  <th class="num-col">P&L</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in store.current.holdings" :key="h.ticker">
                  <td class="ticker-col">
                    <RouterLink :to="`/instrument/${h.ticker}`" class="ticker-link">
                      {{ h.ticker }}
                    </RouterLink>
                  </td>
                  <td class="name-col">{{ h.name }}</td>
                  <td class="num-col font-mono">{{ formatNumber(h.quantity, 0) }}</td>
                  <td class="num-col font-mono">
                    <span v-if="h.purchasePrice !== undefined">
                      {{ formatNumber(h.purchasePrice) }}
                    </span>
                    <span v-else class="dim">—</span>
                  </td>
                  <td class="num-col font-mono">{{ formatNumber(h.calculations.cleanPrice) }}</td>
                  <td class="num-col font-mono">{{ formatPrice(h.currentValue, h.currency) }}</td>
                  <td class="num-col font-mono">{{ formatYield(h.calculations.ytm) }}</td>
                  <td class="num-col font-mono">
                    <span
                      v-if="h.gainLoss !== undefined"
                      :class="h.gainLoss >= 0 ? 'num-positive' : 'num-negative'"
                    >
                      {{ h.gainLoss >= 0 ? "+" : "" }}{{ formatPrice(h.gainLoss, h.currency) }}
                    </span>
                    <span v-else class="dim">—</span>
                  </td>
                  <td class="action-col">
                    <button class="remove-btn" title="Eliminar" @click="handleRemove(h.ticker)">
                      ✕
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="state-msg">No hay instrumentos en este portafolio.</div>

          <!-- Add instrument -->
          <div class="add-section">
            <button v-if="!showAddForm" class="add-toggle-btn" @click="showAddForm = true">
              + Agregar instrumento
            </button>

            <div v-else class="add-form card">
              <h3 class="form-title">Agregar instrumento</h3>
              <div class="form-fields">
                <div class="field">
                  <label class="field-label">Ticker</label>
                  <input
                    v-model="addTicker"
                    class="field-input font-mono"
                    type="text"
                    placeholder="ej. AL30D"
                    maxlength="10"
                    style="text-transform: uppercase"
                  />
                </div>
                <div class="field">
                  <label class="field-label">Cantidad (VN)</label>
                  <input
                    v-model.number="addQuantity"
                    class="field-input font-mono"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="ej. 10000"
                  />
                </div>
                <div class="field">
                  <label class="field-label">Precio de compra <span class="dim">(opcional)</span></label>
                  <input
                    v-model.number="addPrice"
                    class="field-input font-mono"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="precio limpio"
                  />
                </div>
              </div>
              <p v-if="addError" class="form-error">{{ addError }}</p>
              <div class="form-actions">
                <button class="cancel-btn" @click="showAddForm = false">Cancelar</button>
                <button class="save-btn" :disabled="addLoading" @click="handleAdd">
                  {{ addLoading ? "Agregando..." : "Agregar" }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Calendar tab ─────────────────────────────────────────────────── -->
        <template v-else>
          <div v-if="store.calendar.length === 0" class="state-msg">
            No hay flujos futuros en este portafolio.
          </div>

          <div v-for="month in store.calendar" :key="month.month" class="month-block">
            <h3 class="month-label">{{ month.label }}</h3>
            <div class="table-wrap card">
              <table class="calendar-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ticker</th>
                    <th class="num-col">Cupón / VN</th>
                    <th class="num-col">Amort. / VN</th>
                    <th class="num-col">Total cobrado</th>
                    <th>Moneda</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in month.payments" :key="`${p.paymentDate}-${p.ticker}`">
                    <td class="font-mono">{{ p.paymentDate }}</td>
                    <td>
                      <RouterLink :to="`/instrument/${p.ticker}`" class="ticker-link">
                        {{ p.ticker }}
                      </RouterLink>
                    </td>
                    <td class="num-col font-mono">{{ formatNumber(p.coupon) }}</td>
                    <td class="num-col font-mono">{{ formatNumber(p.amortization) }}</td>
                    <td class="num-col font-mono">
                      <template v-if="p.totalFlowScaled !== undefined">
                        {{ formatPrice(p.totalFlowScaled, p.currency === 'ARS' ? 'ARS' : 'USD') }}
                      </template>
                      <span v-else>{{ formatNumber(p.totalFlow) }}</span>
                    </td>
                    <td class="dim">{{ p.currency }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </template>
    </div>
  </main>
</template>

<style scoped>
.page { padding: 2rem 1.5rem; }
.page-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.back-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-dim);
  transition: color var(--transition-base);
}
.back-btn:hover { color: var(--color-accent); }
.page-title { margin: 0; font-size: 1.5rem; font-weight: 700; }

/* Tabs */
.tabs {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}
.tab-btn {
  all: unset;
  padding: 0.4rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background var(--transition-base), color var(--transition-base);
}
.tab-btn.active { background: var(--color-accent); color: #000; }

/* Totals */
.totals-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.total-chip {
  padding: 0.75rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 180px;
}
.total-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-dim); }
.total-value { font-size: 1.1rem; font-weight: 600; }

/* Tables */
.table-wrap { overflow-x: auto; }
.holdings-table,
.calendar-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.holdings-table th,
.holdings-table td,
.calendar-table th,
.calendar-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.holdings-table thead th,
.calendar-table thead th {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}
.holdings-table tbody tr:last-child td,
.calendar-table tbody tr:last-child td { border-bottom: none; }
.num-col { text-align: right; }
.ticker-col { font-weight: 600; }
.name-col { color: var(--color-text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
.ticker-link { color: var(--color-accent); text-decoration: none; }
.ticker-link:hover { text-decoration: underline; }
.action-col { text-align: center; width: 36px; }
.remove-btn {
  all: unset;
  cursor: pointer;
  color: var(--color-text-dim);
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  transition: color var(--transition-base);
}
.remove-btn:hover { color: var(--color-negative, #ef4444); }
.dim { color: var(--color-text-dim); }

/* Add form */
.add-section { display: flex; flex-direction: column; gap: 0.75rem; }
.add-toggle-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-accent);
  font-weight: 500;
  padding: 0.5rem 0;
}
.add-form { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; max-width: 600px; }
.form-title { margin: 0; font-size: 0.95rem; font-weight: 600; }
.form-fields { display: flex; gap: 1rem; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-dim); }
.field-input {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text-primary);
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  outline: none;
  width: 140px;
}
.field-input:focus { border-color: var(--color-accent); }
.form-error { margin: 0; font-size: 0.8rem; color: var(--color-negative, #ef4444); }
.form-actions { display: flex; gap: 0.75rem; }
.cancel-btn {
  all: unset;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}
.save-btn {
  all: unset;
  cursor: pointer;
  padding: 0.5rem 1.25rem;
  background: var(--color-accent);
  color: #000;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Calendar */
.month-block { display: flex; flex-direction: column; gap: 0.5rem; }
.month-label { margin: 0; font-size: 0.9rem; font-weight: 600; text-transform: capitalize; color: var(--color-text-secondary); }

.state-msg { color: var(--color-text-secondary); font-size: 0.9rem; }
.state-msg.error { color: var(--color-negative, #ef4444); }

.num-positive { color: var(--color-positive, #22c55e); }
.num-negative { color: var(--color-negative, #ef4444); }
</style>
