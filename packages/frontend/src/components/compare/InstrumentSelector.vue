<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Instrument } from '@investor-app/shared'

const props = defineProps<{
  instruments: Instrument[]
  selected: string[]
  loading: boolean
  canAddMore: boolean
}>()

const emit = defineEmits<{
  add: [ticker: string]
  remove: [ticker: string]
}>()

const search = ref('')
const showDropdown = ref(false)

const filtered = computed(() => {
  if (search.value.trim().length < 1) return []
  const q = search.value.toLowerCase()
  return props.instruments
    .filter(
      (i) =>
        !props.selected.includes(i.ticker) &&
        (i.ticker.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.issuer ?? '').toLowerCase().includes(q)),
    )
    .slice(0, 8)
})

function select(ticker: string): void {
  emit('add', ticker)
  search.value = ''
  showDropdown.value = false
}

function onBlur(): void {
  // Delay to allow click on dropdown item to fire first
  setTimeout(() => { showDropdown.value = false }, 150)
}

const TYPE_COLORS: Record<string, string> = {
  BOND:   '#22c55e',
  LETTER: '#60a5fa',
  ON:     '#f59e0b',
}
</script>

<template>
  <div class="selector">

    <!-- Selected chips -->
    <div v-if="selected.length > 0" class="chips">
      <div
        v-for="ticker in selected"
        :key="ticker"
        class="chip font-mono"
      >
        {{ ticker }}
        <button class="chip-remove" @click="emit('remove', ticker)">×</button>
      </div>
      <span class="chip-count">{{ selected.length }}/5</span>
    </div>

    <!-- Search input -->
    <div v-if="canAddMore" class="search-wrapper">
      <input
        v-model="search"
        class="search-input"
        type="text"
        placeholder="Buscar instrumento para agregar..."
        spellcheck="false"
        :disabled="loading"
        @focus="showDropdown = true"
        @blur="onBlur"
        @input="showDropdown = true"
      />

      <!-- Dropdown -->
      <div v-if="showDropdown && filtered.length > 0" class="dropdown">
        <button
          v-for="instrument in filtered"
          :key="instrument.ticker"
          class="dropdown-item"
          @mousedown.prevent="select(instrument.ticker)"
        >
          <span class="item-ticker font-mono">{{ instrument.ticker }}</span>
          <span
            class="item-type"
            :style="{ color: TYPE_COLORS[instrument.type] ?? 'inherit' }"
          >
            {{ instrument.type }}
          </span>
          <span class="item-name">{{ instrument.name }}</span>
        </button>
      </div>

      <div v-else-if="showDropdown && search.length > 0 && filtered.length === 0" class="dropdown">
        <p class="dropdown-empty">Sin resultados para "{{ search }}"</p>
      </div>
    </div>

    <p v-else class="max-reached">
      Máximo 5 instrumentos. Remové uno para agregar otro.
    </p>

  </div>
</template>

<style scoped>
.selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.625rem;
  border-radius: 0.375rem;
  background: var(--color-accent-dim);
  border: 1px solid var(--color-accent);
  color: var(--color-accent);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.chip-remove {
  all: unset;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  color: var(--color-accent);
  opacity: 0.7;
  transition: opacity var(--transition-base);
}
.chip-remove:hover { opacity: 1; }

.chip-count {
  font-size: 0.72rem;
  color: var(--color-text-dim);
  font-family: var(--font-mono);
  margin-left: 0.25rem;
}

/* Search */
.search-wrapper {
  position: relative;
  max-width: 480px;
}

.search-input {
  width: 100%;
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
.search-input:focus { border-color: var(--color-accent); }
.search-input::placeholder { color: var(--color-text-dim); }
.search-input:disabled { opacity: 0.5; cursor: not-allowed; }

/* Dropdown */
.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  z-index: 100;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.dropdown-item {
  all: unset;
  display: grid;
  grid-template-columns: 80px 60px 1fr;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: background var(--transition-base);
  box-sizing: border-box;
}
.dropdown-item:hover { background: var(--color-bg-sunken); }

.item-ticker {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.04em;
}

.item-type {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.item-name {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-empty {
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin: 0;
}

.max-reached {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin: 0;
}
</style>
