<script setup lang="ts">
import { ref, computed } from "vue";
import type { CashflowWithPV } from "@investor-app/shared";
import type { Currency } from "@investor-app/shared";
import { formatDate, formatNumber } from "@/composables/useFormat";

const props = defineProps<{
  cashflows: CashflowWithPV[];
  currency: Currency;
}>();

const showPast = ref(false);
const today = new Date().toISOString().slice(0, 10);

const hasPast = computed(() => props.cashflows.some((cf) => cf.paymentDate < today));

const visible = computed(() => {
  // Filter out phantom cashflows (issue-date markers with zero flow)
  const real = props.cashflows.filter((cf) => cf.coupon + cf.amortization > 0);
  return showPast.value ? real : real.filter((cf) => cf.paymentDate >= today);
});
</script>

<template>
  <div class="table-wrapper card">
    <div v-if="hasPast" class="table-toolbar">
      <label class="past-toggle">
        <input v-model="showPast" type="checkbox" />
        Mostrar pagos pasados
      </label>
    </div>
    <table class="cashflow-table">
      <thead>
        <tr>
          <th>Fecha de pago</th>
          <th class="text-right">Cupón</th>
          <th class="text-right">Amortización</th>
          <th class="text-right">Flujo total</th>
          <th class="text-right">Residual</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="cf in visible"
          :key="cf.paymentDate"
          :class="{ 'row-past': cf.paymentDate < today }"
        >
          <td class="font-mono date-cell">{{ formatDate(cf.paymentDate) }}</td>
          <td class="font-mono text-right">
            <span v-if="cf.coupon > 0" style="color: var(--color-accent)">
              {{ currency }} {{ formatNumber(cf.coupon, 4) }}
            </span>
            <span v-else class="dim">—</span>
          </td>
          <td class="font-mono text-right">
            <span v-if="cf.amortization > 0" style="color: var(--color-positive)">
              {{ currency }} {{ formatNumber(cf.amortization, 2) }}
            </span>
            <span v-else class="dim">—</span>
          </td>
          <td class="font-mono text-right">
            {{ currency }} {{ formatNumber(cf.coupon + cf.amortization, 4) }}
          </td>
          <td class="font-mono text-right">{{ formatNumber(cf.residual * 100, 0) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrapper {
  overflow-x: auto;
}

.table-toolbar {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.past-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.past-toggle input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--color-accent);
}

.row-past td {
  opacity: 0.45;
}

.cashflow-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

thead tr {
  border-bottom: 1px solid var(--color-border);
}

th {
  padding: 0.75rem 1rem;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-dim);
  text-align: left;
  white-space: nowrap;
}

th.text-right {
  text-align: right;
}

td {
  padding: 0.75rem 1rem;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-dim);
  white-space: nowrap;
}

td.text-right {
  text-align: right;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover td {
  background-color: var(--color-bg-sunken);
  color: var(--color-text-primary);
}

.date-cell {
  color: var(--color-text-primary);
  font-weight: 500;
}

.pv-cell {
  color: var(--color-text-primary);
  font-weight: 500;
}

.dim {
  color: var(--color-text-dim);
}
</style>
