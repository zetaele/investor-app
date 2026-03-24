<script setup lang="ts">
import { useRouter } from "vue-router";
import type { CompareEntry, Currency } from "@investor-app/shared";
import {
  formatYield,
  formatPrice,
  formatNumber,
  formatDate,
  formatTimeToMaturity,
} from "@/composables/useFormat";

const props = defineProps<{
  entries: CompareEntry[];
  currency: Currency;
}>();

const router = useRouter();

interface Row {
  label: string;
  tooltip: string;
  getValue: (e: CompareEntry) => string;
  getClass?: (e: CompareEntry) => string;
}

const rows: Row[] = [
  {
    label: "Precio mercado",
    tooltip: "Último precio de cierre",
    getValue: (e) => formatPrice(e.price, e.currency),
  },
  {
    label: "TIR (YTM)",
    tooltip: "Tasa Interna de Retorno anual al vencimiento",
    getValue: (e) => formatYield(e.calculations.ytm),
    getClass: (e) => {
      if (e.calculations.ytm > 0.15) return "num-positive";
      if (e.calculations.ytm > 0.08) return "num-neutral";
      return "num-negative";
    },
  },
  {
    label: "Precio limpio",
    tooltip: "Precio sin interés corrido",
    getValue: (e) => formatPrice(e.calculations.cleanPrice, props.currency),
  },
  {
    label: "Precio sucio",
    tooltip: "Precio efectivo del comprador",
    getValue: (e) => formatPrice(e.calculations.dirtyPrice, props.currency),
  },
  {
    label: "Interés corrido",
    tooltip: "Cupón devengado desde el último pago",
    getValue: (e) => formatPrice(e.calculations.accruedInterest, props.currency),
  },
  {
    label: "Duration mod.",
    tooltip: "Sensibilidad del precio al movimiento de tasas",
    getValue: (e) => `${formatNumber(e.calculations.modifiedDuration)} años`,
  },
  {
    label: "Paridad",
    tooltip: "Precio como % del valor nominal",
    getValue: (e) => formatYield(e.calculations.parityPct),
  },
  {
    label: "Vencimiento",
    tooltip: "Fecha de vencimiento del instrumento",
    getValue: (e) => formatDate(e.maturityDate),
  },
  {
    label: "Tiempo al venc.",
    tooltip: "Tiempo restante hasta el vencimiento",
    getValue: (e) => formatTimeToMaturity(e.maturityDate),
  },
];
</script>

<template>
  <div class="compare-table-wrapper card">
    <table class="compare-table">
      <thead>
        <tr>
          <th class="row-label-header">Métrica</th>
          <th v-for="entry in entries" :key="entry.ticker" class="ticker-header">
            <button
              class="ticker-link font-mono"
              :data-type="entry.type"
              @click="router.push(`/instrument/${entry.ticker}`)"
            >
              {{ entry.ticker }}
            </button>
            <span class="type-label">{{ entry.type }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <td class="row-label" :title="row.tooltip">
            {{ row.label }}
            <span class="tooltip-icon">?</span>
          </td>
          <td
            v-for="entry in entries"
            :key="entry.ticker"
            class="data-cell font-mono"
            :class="row.getClass?.(entry)"
          >
            {{ row.getValue(entry) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.compare-table-wrapper {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

/* Header row */
thead tr {
  border-bottom: 2px solid var(--color-border);
}

.row-label-header {
  padding: 0.875rem 1rem;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-dim);
  min-width: 160px;
}

.ticker-header {
  padding: 0.875rem 1rem;
  text-align: right;
  min-width: 160px;
}

.ticker-link {
  all: unset;
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: color var(--transition-base);
  color: var(--color-text-primary);
}

.ticker-link:hover {
  color: var(--color-accent);
}

.type-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  text-transform: uppercase;
  margin-top: 0.2rem;
}

/* Body rows */
tbody tr {
  border-bottom: 1px solid var(--color-border-dim);
  transition: background var(--transition-base);
}

tbody tr:last-child {
  border-bottom: none;
}

tbody tr:hover td {
  background-color: var(--color-bg-sunken);
}

.row-label {
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.tooltip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  font-size: 0.58rem;
  color: var(--color-text-dim);
  cursor: help;
  flex-shrink: 0;
}

.data-cell {
  padding: 0.75rem 1rem;
  text-align: right;
  color: var(--color-text-primary);
  font-weight: 500;
  white-space: nowrap;
}
</style>
