<script setup lang="ts">
import { computed } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import type { CompareEntry } from '@investor-app/shared'
import { formatYield, formatTimeToMaturity, daysUntil } from '@/composables/useFormat'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, ChartDataLabels)

const props = defineProps<{ entries: CompareEntry[] }>()

const isDark = computed(() => document.documentElement.classList.contains('dark'))

/** Color per instrument index */
const COLORS = [
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.85)' },
  { border: '#22c55e', bg: 'rgba(34,197,94,0.85)' },
  { border: '#60a5fa', bg: 'rgba(96,165,250,0.85)' },
  { border: '#a78bfa', bg: 'rgba(167,139,250,0.85)' },
  { border: '#fb7185', bg: 'rgba(251,113,133,0.85)' },
]

/** Point shape by instrument type */
const TYPE_SHAPES: Record<string, 'circle' | 'triangle' | 'rect'> = {
  BOND:   'circle',
  ON:     'triangle',
  LETTER: 'rect',
}

const chartData = computed(() => ({
  datasets: props.entries.map((entry, i) => {
    const color = COLORS[i % COLORS.length] ?? COLORS[0]!
    return {
      label: entry.ticker,
      data: [
        {
          x: daysUntil(entry.maturityDate) / 365,
          y: entry.calculations.ytm * 100,
        },
      ],
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      pointRadius: 12,
      pointHoverRadius: 15,
      pointStyle: TYPE_SHAPES[entry.type] ?? 'circle',
    }
  }),
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2.5,
  layout: {
    padding: { top: 24, right: 24, bottom: 8, left: 8 },
  },
  plugins: {
    legend: {
      display: false, // labels on chart make legend redundant
    },
    tooltip: {
      backgroundColor: isDark.value ? '#141918' : '#faf7f2',
      borderColor: isDark.value ? '#2a3330' : '#d6cfc0',
      borderWidth: 1,
      titleColor: isDark.value ? '#e8ede8' : '#1a1612',
      bodyColor: isDark.value ? '#7a9488' : '#6b6256',
      titleFont: { family: 'JetBrains Mono', size: 12, weight: '600' as const },
      bodyFont: { family: 'JetBrains Mono', size: 11 },
      padding: 12,
      callbacks: {
        title: (items: { datasetIndex: number }[]) => {
          const entry = props.entries[items[0]?.datasetIndex ?? 0]
          return entry ? `${entry.ticker} — ${entry.type}` : ''
        },
        label: (ctx: { datasetIndex: number }) => {
          const entry = props.entries[ctx.datasetIndex]
          if (entry === undefined) return ''
          return [
            ` TIR: ${formatYield(entry.calculations.ytm)}`,
            ` Paridad: ${formatYield(entry.calculations.parityPct)}`,
            ` Venc: ${formatTimeToMaturity(entry.maturityDate)}`,
          ]
        },
      },
    },
    datalabels: {
      display: true,
      formatter: (_: unknown, ctx: { datasetIndex: number }) => {
        return props.entries[ctx.datasetIndex]?.ticker ?? ''
      },
      color: isDark.value ? '#e8ede8' : '#1a1612',
      font: {
        family: 'JetBrains Mono',
        size: 11,
        weight: '600' as const,
      },
      anchor: 'end' as const,
      align: 'top' as const,
      offset: 6,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: 'Años al vencimiento',
        color: isDark.value ? '#4a6058' : '#9c9086',
        font: { family: 'JetBrains Mono', size: 10 },
        padding: { top: 8 },
      },
      grid: {
        color: isDark.value ? 'rgba(42,51,48,0.8)' : 'rgba(214,207,192,0.6)',
      },
      ticks: {
        color: isDark.value ? '#4a6058' : '#9c9086',
        font: { family: 'JetBrains Mono', size: 10 },
        callback: (val: number | string) => `${Number(val).toFixed(1)}a`,
      },
    },
    y: {
      title: {
        display: true,
        text: 'TIR (%)',
        color: isDark.value ? '#4a6058' : '#9c9086',
        font: { family: 'JetBrains Mono', size: 10 },
        padding: { bottom: 8 },
      },
      grid: {
        color: isDark.value ? 'rgba(42,51,48,0.8)' : 'rgba(214,207,192,0.6)',
      },
      ticks: {
        color: isDark.value ? '#4a6058' : '#9c9086',
        font: { family: 'JetBrains Mono', size: 10 },
        callback: (val: number | string) => `${Number(val).toFixed(1)}%`,
      },
    },
  },
}))
</script>

<template>
  <div>
    <!-- Legend by shape -->
    <div class="shape-legend">
      <span class="legend-item">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.7" />
        </svg>
        Bono
      </span>
      <span class="legend-item">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <polygon points="6,1 11,11 1,11" fill="currentColor" opacity="0.7" />
        </svg>
        ON
      </span>
      <span class="legend-item">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" fill="currentColor" opacity="0.7" />
        </svg>
        Letra
      </span>
    </div>
    <Scatter :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.shape-legend {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.72rem;
  font-family: var(--font-mono);
  color: var(--color-text-dim);
}
</style>
