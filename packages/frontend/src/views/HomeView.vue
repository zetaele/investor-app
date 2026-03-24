<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { Instrument, InstrumentType } from "@investor-app/shared";
import { fetchInstruments } from "@/services/api";
import { formatDate, formatTimeToMaturity } from "@/composables/useFormat";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

const router = useRouter();

const instruments = ref<Instrument[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref("");
const activeType = ref<InstrumentType | "ALL">("ALL");
const sortKey = ref<"ticker" | "maturityDate" | "currency">("maturityDate");
const sortDir = ref<"asc" | "desc">("asc");

const TYPE_LABELS: Record<InstrumentType | "ALL", string> = {
  ALL: "Todos",
  BOND: "Bonos",
  LETTER: "Letras",
  ON: "ONs",
};

const TYPE_ORDER: Record<InstrumentType, number> = {
  LETTER: 0,
  BOND: 1,
  ON: 2,
};

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    instruments.value = await fetchInstruments();
  } catch {
    error.value = "No se pudieron cargar los instrumentos.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const filtered = computed(() => {
  let list = instruments.value.filter((i) => {
    const matchesType =
      activeType.value === "ALL" || i.type === activeType.value;
    const q = search.value.toLowerCase();
    const matchesSearch =
      q === "" ||
      i.ticker.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.issuer ?? "").toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  list = [...list].sort((a, b) => {
    let cmp = 0;
    if (sortKey.value === "ticker") {
      cmp = a.ticker.localeCompare(b.ticker);
    } else if (sortKey.value === "maturityDate") {
      cmp = a.maturityDate.localeCompare(b.maturityDate);
    } else if (sortKey.value === "currency") {
      cmp = a.currency.localeCompare(b.currency);
    }
    if (cmp === 0) cmp = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    if (cmp === 0) cmp = a.ticker.localeCompare(b.ticker);
    return sortDir.value === "asc" ? cmp : -cmp;
  });

  return list;
});

const grouped = computed(() => {
  if (activeType.value !== "ALL") return null;

  const list = filtered.value; // explicit dependency on filtered
  if (list.length === 0) return null;

  const order: InstrumentType[] = ["LETTER", "BOND", "ON"];

  return order
    .map((type) => ({
      type,
      instruments: list.filter((i) => i.type === type),
    }))
    .filter((g) => g.instruments.length > 0);
});

function toggleSort(key: typeof sortKey.value): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "asc";
  }
}

function sortIcon(key: typeof sortKey.value): string {
  if (sortKey.value !== key) return "↕";
  return sortDir.value === "asc" ? "↑" : "↓";
}

function goToInstrument(ticker: string): void {
  router.push({ name: "instrument", params: { ticker } });
}

function goToCompare(): void {
  router.push({ name: "compare" });
}
</script>

<template>
  <div class="home">
    <header class="home-header">
      <div class="header-left">
        <h1 class="home-title font-display">Mercado Argentino</h1>
        <p class="home-subtitle">
          Bonos, letras y obligaciones negociables · BYMA
        </p>
      </div>
      <button class="compare-cta" @click="goToCompare">Comparar →</button>
    </header>

    <div class="controls">
      <div class="type-filters">
        <button
          v-for="type in ['ALL', 'BOND', 'LETTER', 'ON'] as const"
          :key="type"
          class="type-btn"
          :class="{ active: activeType === type }"
          @click="activeType = type"
        >
          {{ TYPE_LABELS[type] }}
        </button>
      </div>
      <input
        v-model="search"
        class="search-input"
        type="text"
        placeholder="Buscar ticker, nombre o emisor..."
        spellcheck="false"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="table-wrapper card">
      <table class="market-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Moneda</th>
            <th>Vencimiento</th>
            <th>Restante</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in 8" :key="n">
            <td>
              <div class="skeleton" style="height: 0.875rem; width: 60px" />
            </td>
            <td>
              <div class="skeleton" style="height: 0.875rem; width: 200px" />
            </td>
            <td>
              <div class="skeleton" style="height: 0.875rem; width: 50px" />
            </td>
            <td>
              <div class="skeleton" style="height: 0.875rem; width: 40px" />
            </td>
            <td>
              <div class="skeleton" style="height: 0.875rem; width: 90px" />
            </td>
            <td>
              <div class="skeleton" style="height: 0.875rem; width: 50px" />
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <ErrorBanner v-else-if="error" :message="error" :on-retry="load" />

    <div v-else-if="filtered.length === 0" class="state-msg">
      Sin resultados para "{{ search }}".
    </div>

    <!-- Grouped table -->
    <template v-else-if="grouped">
      <div v-for="group in grouped" :key="group.type" class="group-block">
        <div class="group-header">
          <span class="group-label" :data-type="group.type">
            {{ TYPE_LABELS[group.type] }}
          </span>
          <span class="group-count font-mono">{{
            group.instruments.length
          }}</span>
        </div>
        <div class="table-wrapper card">
          <table class="market-table">
            <thead>
              <tr>
                <th class="sortable" @click="toggleSort('ticker')">
                  Ticker <span class="sort-icon">{{ sortIcon("ticker") }}</span>
                </th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th class="sortable" @click="toggleSort('currency')">
                  Moneda
                  <span class="sort-icon">{{ sortIcon("currency") }}</span>
                </th>
                <th class="sortable" @click="toggleSort('maturityDate')">
                  Vencimiento
                  <span class="sort-icon">{{ sortIcon("maturityDate") }}</span>
                </th>
                <th>Restante</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="instrument in group.instruments"
                :key="instrument.ticker"
                class="instrument-row"
                @click="goToInstrument(instrument.ticker)"
              >
                <td class="ticker-cell font-mono">{{ instrument.ticker }}</td>
                <td class="name-cell">{{ instrument.name }}</td>
                <td>
                  <span class="type-badge" :data-type="instrument.type">{{
                    instrument.type
                  }}</span>
                </td>
                <td class="font-mono currency-cell">
                  {{ instrument.currency }}
                </td>
                <td class="font-mono date-cell">
                  {{ formatDate(instrument.maturityDate) }}
                </td>
                <td class="font-mono ttm-cell">
                  {{ formatTimeToMaturity(instrument.maturityDate) }}
                </td>
                <td class="arrow-cell">→</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Flat table -->
    <div v-else class="table-wrapper card">
      <table class="market-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('ticker')">
              Ticker <span class="sort-icon">{{ sortIcon("ticker") }}</span>
            </th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th class="sortable" @click="toggleSort('currency')">
              Moneda <span class="sort-icon">{{ sortIcon("currency") }}</span>
            </th>
            <th class="sortable" @click="toggleSort('maturityDate')">
              Vencimiento
              <span class="sort-icon">{{ sortIcon("maturityDate") }}</span>
            </th>
            <th>Restante</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="instrument in filtered"
            :key="instrument.ticker"
            class="instrument-row"
            @click="goToInstrument(instrument.ticker)"
          >
            <td class="ticker-cell font-mono">{{ instrument.ticker }}</td>
            <td class="name-cell">{{ instrument.name }}</td>
            <td>
              <span class="type-badge" :data-type="instrument.type">{{
                instrument.type
              }}</span>
            </td>
            <td class="font-mono currency-cell">{{ instrument.currency }}</td>
            <td class="font-mono date-cell">
              {{ formatDate(instrument.maturityDate) }}
            </td>
            <td class="font-mono ttm-cell">
              {{ formatTimeToMaturity(instrument.maturityDate) }}
            </td>
            <td class="arrow-cell">→</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!loading && !error" class="result-count font-mono">
      {{ filtered.length }} instrumento{{ filtered.length !== 1 ? "s" : "" }}
    </p>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1rem;
}

.home-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 0 0;
}

.home-title {
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0 0 0.5rem;
}

.home-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
}

.compare-cta {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-accent);
  background: var(--color-accent-dim);
  color: var(--color-accent);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-base);
  flex-shrink: 0;
}
.compare-cta:hover {
  background: var(--color-accent);
  color: #000;
}

.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.type-filters {
  display: flex;
  gap: 0.375rem;
}

.type-btn {
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
.type-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.type-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #000;
  font-weight: 600;
}

.search-input {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-sunken);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;
  width: 260px;
  transition: border-color var(--transition-base);
}
.search-input:focus {
  border-color: var(--color-accent);
}
.search-input::placeholder {
  color: var(--color-text-dim);
}

.table-wrapper {
  overflow-x: auto;
}

.market-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

thead tr {
  border-bottom: 2px solid var(--color-border);
  top: 56px;
  background: var(--color-bg-elevated);
  z-index: 10;
}

th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  white-space: nowrap;
  user-select: none;
}

th.sortable {
  cursor: pointer;
  transition: color var(--transition-base);
}
th.sortable:hover {
  color: var(--color-accent);
}

.sort-icon {
  font-size: 0.7rem;
  opacity: 0.6;
  margin-left: 0.25rem;
}

.group-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
}

.group-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-right: 0.5rem;
}
.group-label[data-type="BOND"] {
  color: #22c55e;
}
.group-label[data-type="LETTER"] {
  color: #60a5fa;
}
.group-label[data-type="ON"] {
  color: #f59e0b;
}

.group-count {
  font-size: 0.68rem;
  color: var(--color-text-dim);
}

.instrument-row {
  border-bottom: 1px solid var(--color-border-dim);
  cursor: pointer;
  transition: background var(--transition-base);
}
.instrument-row:last-child {
  border-bottom: none;
}
.instrument-row:hover td {
  background: var(--color-bg-sunken);
}
.instrument-row:hover .arrow-cell {
  color: var(--color-accent);
}

td {
  padding: 0.875rem 1rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.ticker-cell {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.04em;
}

.name-cell {
  color: var(--color-text-secondary);
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
}

.type-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.45rem;
  border-radius: 0.2rem;
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

.currency-cell {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--color-text-dim);
}

.date-cell {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.ttm-cell {
  font-size: 0.82rem;
  color: var(--color-accent);
  font-weight: 500;
}

.arrow-cell {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  transition: color var(--transition-base);
  text-align: right;
}

.result-count {
  font-size: 0.72rem;
  color: var(--color-text-dim);
  letter-spacing: 0.04em;
  margin: 0;
}

.state-msg {
  padding: 3rem 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>
