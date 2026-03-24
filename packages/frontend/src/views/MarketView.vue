<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { Instrument, InstrumentType } from "@investor-app/shared";
import { fetchInstruments } from "@/services/api";
import { formatDate, formatTimeToMaturity } from "@/composables/useFormat";
import ErrorBanner from "@/components/ui/ErrorBanner.vue";

const props = defineProps<{ type: InstrumentType }>();
const router = useRouter();

const instruments = ref<Instrument[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const search = ref("");
const sortKey = ref<"ticker" | "maturityDate" | "currency">("maturityDate");
const sortDir = ref<"asc" | "desc">("asc");

const SECTION_CONFIG: Record<InstrumentType, { title: string; subtitle: string }> = {
  BOND: {
    title: "Bonos Soberanos",
    subtitle: "Bonos del Tesoro Nacional · BYMA",
  },
  LETTER: {
    title: "Letras del Tesoro",
    subtitle: "Letras a descuento, CER y dólar-linked · BYMA",
  },
  ON: {
    title: "Obligaciones Negociables",
    subtitle: "Bonos corporativos · BYMA",
  },
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

// Reset filters when switching sections (component is reused across routes)
watch(
  () => props.type,
  () => {
    search.value = "";
    sortKey.value = "maturityDate";
    sortDir.value = "asc";
  },
);

const filtered = computed(() => {
  const list = instruments.value.filter((i) => {
    if (i.type !== props.type) return false;
    const q = search.value.toLowerCase();
    return (
      q === "" ||
      i.ticker.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.issuer ?? "").toLowerCase().includes(q)
    );
  });

  return [...list].sort((a, b) => {
    let cmp = 0;
    if (sortKey.value === "ticker") cmp = a.ticker.localeCompare(b.ticker);
    else if (sortKey.value === "maturityDate") cmp = a.maturityDate.localeCompare(b.maturityDate);
    else if (sortKey.value === "currency") cmp = a.currency.localeCompare(b.currency);
    if (cmp === 0) cmp = a.ticker.localeCompare(b.ticker);
    return sortDir.value === "asc" ? cmp : -cmp;
  });
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
  <div class="market-view">
    <header class="market-header">
      <div class="header-left">
        <h1 class="market-title font-display">{{ SECTION_CONFIG[type].title }}</h1>
        <p class="market-subtitle">{{ SECTION_CONFIG[type].subtitle }}</p>
      </div>
      <button class="compare-cta" @click="goToCompare">Comparar →</button>
    </header>

    <div class="controls">
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
            <th>Moneda</th>
            <th>Vencimiento</th>
            <th>Restante</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in 6" :key="n">
            <td><div class="skeleton" style="height: 0.875rem; width: 60px" /></td>
            <td><div class="skeleton" style="height: 0.875rem; width: 220px" /></td>
            <td><div class="skeleton" style="height: 0.875rem; width: 40px" /></td>
            <td><div class="skeleton" style="height: 0.875rem; width: 90px" /></td>
            <td><div class="skeleton" style="height: 0.875rem; width: 50px" /></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <ErrorBanner v-else-if="error" :message="error" :on-retry="load" />

    <div v-else-if="filtered.length === 0" class="state-msg">
      Sin resultados para "{{ search }}".
    </div>

    <div v-else class="table-wrapper card">
      <table class="market-table">
        <thead>
          <tr>
            <th class="sortable" @click="toggleSort('ticker')">
              Ticker <span class="sort-icon">{{ sortIcon("ticker") }}</span>
            </th>
            <th>Nombre</th>
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
            <td class="font-mono currency-cell">{{ instrument.currency }}</td>
            <td class="font-mono date-cell">{{ formatDate(instrument.maturityDate) }}</td>
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
.market-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1rem;
}

.market-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 0 0;
}

.market-title {
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0 0 0.5rem;
}

.market-subtitle {
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
  width: 300px;
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
  background: var(--color-bg-elevated);
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
  max-width: 380px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
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

@media (max-width: 640px) {
  .search-input {
    width: 100%;
  }

  .market-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
