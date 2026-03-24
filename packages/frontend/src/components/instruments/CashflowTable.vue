<script setup lang="ts">
import type { CashflowWithPV } from "@investor-app/shared";
import type { Currency } from "@investor-app/shared";
import { formatDate, formatNumber } from "@/composables/useFormat";

defineProps<{
  cashflows: CashflowWithPV[];
  currency: Currency;
}>();
</script>

<template>
  <div class="table-wrapper card">
    <table class="cashflow-table">
      <thead>
        <tr>
          <th>Fecha de pago</th>
          <th class="text-right">Cupón</th>
          <th class="text-right">Amortización</th>
          <th class="text-right">Flujo total</th>
          <th class="text-right">Residual</th>
          <th class="text-right">Valor presente</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cf in cashflows" :key="cf.paymentDate">
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
          <td class="font-mono text-right pv-cell">
            {{ currency }} {{ formatNumber(cf.presentValue, 4) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrapper {
  overflow-x: auto;
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
