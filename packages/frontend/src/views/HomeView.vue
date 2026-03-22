<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Instrument, InstrumentType } from '@investor-app/shared'
import { fetchInstruments } from '@/services/api'
import { formatDate, formatTimeToMaturity } from '@/composables/useFormat'

const router = useRouter()

const instruments = ref<Instrument[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const activeType = ref<InstrumentType | 'ALL'>('ALL')

const TYPE_LABELS: Record<InstrumentType | 'ALL', string> = {
  ALL:    'Todos',
  BOND:   'Bonos',
  LETTER: 'Letras',
  ON:     'ONs',
}

const filtered = computed(() => {
  return instruments.value.filter((i) => {
    const matchesType = activeType.value === 'ALL' || i.type === activeType.value
    const q = search.value.toLowerCase()
    const matchesSearch =
      q === '' ||
      i.ticker.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.issuer ?? '').toLowerCase().includes(q)
    return matchesType && matchesSearch
  })
})

onMounted(async () => {
  try {
    instruments.value = await fetchInstruments()
  } catch {
    error.value = 'No se pudieron cargar los instrumentos.'
  } finally {
    loading.value = false
  }
})

function goToInstrument(ticker: string): void {
  router.push({ name: 'instrument', params: { ticker } })
}

function goToCompare(): void {
  router.push({ name: 'compare' })
}
</script>

<template>
  <div class="home">

    <!-- Header -->
    <header class="home-header">
      <h1 class="home-title font-display">
        Mercado Argentino
      </h1>
      <p class="home-subtitle">
        Análisis de bonos, letras y obligaciones negociables en tiempo real.
      </p>
      <button class="compare-cta" @click="goToCompare">
        Comparar instrumentos →
      </button>
    </header>

    <!-- Filters -->
    <div class="filters">
      <input
        v-model="search"
        class="search-input"
        type="text"
        placeholder="Buscar por ticker, nombre o emisor..."
        spellcheck="false"
      />
      <div class="type-filters">
        <button
          v-for="type in (['ALL', 'BOND', 'LETTER', 'ON'] as const)"
          :key="type"
          class="type-btn"
          :class="{ active: activeType === type }"
          @click="activeType = type"
        >
          {{ TYPE_LABELS[type] }}
        </button>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="instrument-grid">
      <div v-for="n in 8" :key="n" class="instrument-card skeleton-card">
        <div class="skeleton" style="height: 1rem; width: 40%; margin-bottom: 0.5rem" />
        <div class="skeleton" style="height: 0.75rem; width: 80%; margin-bottom: 1rem" />
        <div class="skeleton" style="height: 0.75rem; width: 50%" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="empty-state">
      <p>No se encontraron instrumentos para "{{ search }}".</p>
    </div>

    <!-- Grid -->
    <div v-else class="instrument-grid">
      <button
        v-for="instrument in filtered"
        :key="instrument.ticker"
        class="instrument-card"
        @click="goToInstrument(instrument.ticker)"
      >
        <div class="card-top">
          <span class="card-ticker font-mono">{{ instrument.ticker }}</span>
          <span class="card-badge" :data-type="instrument.type">
            {{ instrument.type }}
          </span>
        </div>
        <p class="card-name">{{ instrument.name }}</p>
        <div class="card-meta">
          <span class="card-currency font-mono">{{ instrument.currency }}</span>
          <span class="card-maturity">{{ formatDate(instrument.maturityDate) }}</span>
          <span class="card-ttm">{{ formatTimeToMaturity(instrument.maturityDate) }}</span>
        </div>
      </button>
    </div>

  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Header */
.home-header {
  padding: 2.5rem 0 0.5rem;
}

.home-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--color-text-primary);
  margin: 0 0 0.75rem;
}

.home-subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
  margin: 0 0 1.25rem;
}

.compare-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-accent);
  background: var(--color-accent-dim);
  color: var(--color-accent);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}

.compare-cta:hover {
  background: var(--color-accent);
  color: #000;
}

/* Filters */
.filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-input {
  width: 100%;
  max-width: 480px;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-sunken);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition-base);
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-input::placeholder {
  color: var(--color-text-dim);
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
}

/* Grid */
.instrument-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* Card */
.instrument-card {
  all: unset;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  cursor: pointer;
  border-radius: 0.75rem;
  background-color: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  text-align: left;
  transition: border-color var(--transition-base), transform var(--transition-base);
}

.instrument-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.skeleton-card {
  pointer-events: none;
  min-height: 120px;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-ticker {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.02em;
}

.card-badge {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
}

.card-badge[data-type='BOND']   { background: rgba(34,197,94,0.12); color: #22c55e; }
.card-badge[data-type='LETTER'] { background: rgba(59,130,246,0.12); color: #60a5fa; }
.card-badge[data-type='ON']     { background: rgba(245,158,11,0.12); color: #f59e0b; }

.card-name {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border-dim);
}

.card-currency {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-dim);
  letter-spacing: 0.05em;
}

.card-maturity {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.card-ttm {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  color: var(--color-accent);
  margin-left: auto;
}

/* States */
.error-state, .empty-state {
  padding: 3rem 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>
