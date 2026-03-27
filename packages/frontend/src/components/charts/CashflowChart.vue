<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import type { CashflowWithPV } from "@investor-app/shared";
import type { Currency } from "@investor-app/shared";
import { formatDate } from "@/composables/useFormat";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const props = defineProps<{
  cashflows: CashflowWithPV[];
  currency: Currency;
}>();

const isDark = computed(() => document.documentElement.classList.contains("dark"));

const chartData = computed(() => ({
  labels: props.cashflows.map((cf) => formatDate(cf.paymentDate)),
  datasets: [
    {
      label: "Cupón",
      data: props.cashflows.map((cf) => cf.coupon),
      backgroundColor: "rgba(245, 158, 11, 0.75)",
      borderColor: "rgba(245, 158, 11, 1)",
      borderWidth: 1,
      borderRadius: 3,
    },
    {
      label: "Amortización",
      data: props.cashflows.map((cf) => cf.amortization),
      backgroundColor: "rgba(34, 197, 94, 0.65)",
      borderColor: "rgba(34, 197, 94, 1)",
      borderWidth: 1,
      borderRadius: 3,
    },
  ],
}));

const chartOptions = computed((): ChartOptions<"bar"> => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2.5,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: isDark.value ? "#7a9488" : "#6b6256",
        font: { family: "JetBrains Mono", size: 11 },
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: isDark.value ? "#141918" : "#faf7f2",
      borderColor: isDark.value ? "#2a3330" : "#d6cfc0",
      borderWidth: 1,
      titleColor: isDark.value ? "#e8ede8" : "#1a1612",
      bodyColor: isDark.value ? "#7a9488" : "#6b6256",
      titleFont: { family: "JetBrains Mono", size: 12, weight: 600 },
      bodyFont: { family: "JetBrains Mono", size: 11 },
      padding: 12,
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label}: ${props.currency} ${(ctx.parsed as { y: number }).y.toFixed(4)}`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      ticks: {
        color: isDark.value ? "#4a6058" : "#9c9086",
        font: { family: "JetBrains Mono", size: 10 },
        maxRotation: 35,
      },
    },
    y: {
      stacked: true,
      grid: {
        color: isDark.value ? "rgba(42,51,48,0.8)" : "rgba(214,207,192,0.6)",
      },
      ticks: {
        color: isDark.value ? "#4a6058" : "#9c9086",
        font: { family: "JetBrains Mono", size: 10 },
        callback: (val: number | string) => `${props.currency} ${Number(val).toFixed(0)}`,
      },
    },
  },
}));
</script>

<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>
