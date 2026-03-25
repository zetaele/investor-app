<script setup lang="ts">
import { computed } from "vue";
import { Scatter } from "vue-chartjs";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { CompareEntry } from "@investor-app/shared";
import { formatYield, formatTimeToMaturity } from "@/composables/useFormat";

ChartJS.register(LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ChartDataLabels);

const props = defineProps<{ entries: CompareEntry[] }>();

const isDark = computed(() => document.documentElement.classList.contains("dark"));

// ── Polynomial regression (OLS, degree 2) ─────────────────────────────────────

/** Solve a small linear system A·x = b via Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[maxRow]![col]!)) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow]!, M[col]!];
    for (let row = col + 1; row < n; row++) {
      const f = M[row]![col]! / M[col]![col]!;
      for (let j = col; j <= n; j++) M[row]![j]! -= f * M[col]![j]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i]![n]!;
    for (let j = i + 1; j < n; j++) x[i] -= M[i]![j]! * x[j]!;
    x[i] /= M[i]![i]!;
  }
  return x;
}

/** Fit polynomial of given degree to points using OLS. Returns coefficients [a0, a1, ..., ad]. */
function polyFit(pts: { x: number; y: number }[], degree: number): number[] {
  const d = degree + 1;
  const XtX = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const Xty = new Array<number>(d).fill(0);
  for (const { x, y } of pts) {
    const xp = Array.from({ length: d }, (_, i) => x ** i);
    for (let i = 0; i < d; i++) {
      Xty[i] += xp[i]! * y;
      for (let j = 0; j < d; j++) XtX[i]![j]! += xp[i]! * xp[j]!;
    }
  }
  return solveLinear(XtX, Xty);
}

/** Evaluate polynomial with coefficients [a0, a1, ..., ad] at x. */
function evalPoly(coeffs: number[], x: number): number {
  return coeffs.reduce((sum, c, i) => sum + c * x ** i, 0);
}

/** Color per instrument index */
const COLORS = [
  { border: "#f59e0b", bg: "rgba(245,158,11,0.85)" },
  { border: "#22c55e", bg: "rgba(34,197,94,0.85)" },
  { border: "#60a5fa", bg: "rgba(96,165,250,0.85)" },
  { border: "#a78bfa", bg: "rgba(167,139,250,0.85)" },
  { border: "#fb7185", bg: "rgba(251,113,133,0.85)" },
];

/** Point shape by instrument type */
const TYPE_SHAPES: Record<string, "circle" | "triangle" | "rect"> = {
  BOND: "circle",
  ON: "triangle",
  LETTER: "rect",
};

const chartData = computed(() => {
  const bondPts = props.entries
    .filter((e) => e.type === "BOND")
    .map((e) => ({ x: e.calculations.modifiedDuration, y: e.calculations.ytm * 100 }));

  const curveColor = isDark.value ? "rgba(120,190,150,0.7)" : "rgba(60,120,80,0.6)";
  const curveFill = isDark.value ? "rgba(120,190,150,0.08)" : "rgba(60,120,80,0.07)";

  // Need ≥3 points for a meaningful quadratic fit; fall back to linear (degree 1) with 2 points
  const fitDegree = bondPts.length >= 3 ? 2 : 1;
  const curveDataset: object[] = [];

  if (bondPts.length >= 2) {
    const coeffs = polyFit(bondPts, fitDegree);
    const xs = bondPts.map((p) => p.x);
    const xMin = Math.min(...xs) - 0.3;
    const xMax = Math.max(...xs) + 0.3;
    const STEPS = 80;
    const fittedPoints = Array.from({ length: STEPS + 1 }, (_, i) => {
      const x = xMin + (i / STEPS) * (xMax - xMin);
      return { x, y: evalPoly(coeffs, x) };
    });

    curveDataset.push({
      label: "__curve__",
      data: fittedPoints,
      showLine: true,
      tension: 0,
      borderColor: curveColor,
      borderWidth: 2,
      backgroundColor: curveFill,
      fill: "origin" as const,
      pointRadius: 0,
      pointHoverRadius: 0,
      datalabels: { display: false },
    });
  }

  const pointDatasets = props.entries.map((entry, i) => {
    const color = COLORS[i % COLORS.length] ?? COLORS[0]!;
    return {
      label: entry.ticker,
      data: [{ x: entry.calculations.modifiedDuration, y: entry.calculations.ytm * 100 }],
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      pointRadius: 12,
      pointHoverRadius: 15,
      pointStyle: TYPE_SHAPES[entry.type] ?? "circle",
    };
  });

  return { datasets: [...curveDataset, ...pointDatasets] };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  aspectRatio: 2.5,
  layout: {
    padding: { top: 36, right: 24, bottom: 8, left: 8 },
  },
  plugins: {
    legend: {
      display: false, // labels on chart make legend redundant
    },
    tooltip: {
      filter: (item: { dataset: { label?: string } }) => item.dataset.label !== "__curve__",
      backgroundColor: isDark.value ? "#141918" : "#faf7f2",
      borderColor: isDark.value ? "#2a3330" : "#d6cfc0",
      borderWidth: 1,
      titleColor: isDark.value ? "#e8ede8" : "#1a1612",
      bodyColor: isDark.value ? "#7a9488" : "#6b6256",
      titleFont: { family: "JetBrains Mono", size: 12, weight: "600" as const },
      bodyFont: { family: "JetBrains Mono", size: 11 },
      padding: 12,
      callbacks: {
        title: (items: { dataset: { label?: string } }[]) => {
          const ticker = items[0]?.dataset.label;
          if (!ticker || ticker === "__curve__") return "";
          const entry = props.entries.find((e) => e.ticker === ticker);
          return entry ? `${entry.ticker} — ${entry.type}` : "";
        },
        label: (ctx: { dataset: { label?: string } }) => {
          const ticker = ctx.dataset.label;
          if (!ticker || ticker === "__curve__") return "";
          const entry = props.entries.find((e) => e.ticker === ticker);
          if (!entry) return "";
          return [
            ` TIR: ${formatYield(entry.calculations.ytm)}`,
            ` Paridad: ${formatYield(entry.calculations.parityPct)}`,
            ` MD: ${entry.calculations.modifiedDuration.toFixed(2)}`,
            ` Venc: ${formatTimeToMaturity(entry.maturityDate)}`,
          ];
        },
      },
    },
    datalabels: {
      display: true,
      formatter: (_: unknown, ctx: { dataset: { label?: string } }) => {
        const ticker = ctx.dataset.label;
        if (!ticker || ticker === "__curve__") return "";
        return ticker;
      },
      color: isDark.value ? "#e8ede8" : "#1a1612",
      font: {
        family: "JetBrains Mono",
        size: 11,
        weight: "600" as const,
      },
      anchor: "end" as const,
      align: "top" as const,
      offset: 6,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Duration modificada (MD)",
        color: isDark.value ? "#4a6058" : "#9c9086",
        font: { family: "JetBrains Mono", size: 10 },
        padding: { top: 8 },
      },
      grid: {
        color: isDark.value ? "rgba(42,51,48,0.8)" : "rgba(214,207,192,0.6)",
      },
      ticks: {
        color: isDark.value ? "#4a6058" : "#9c9086",
        font: { family: "JetBrains Mono", size: 10 },
        callback: (val: number | string) => Number(val).toFixed(1),
      },
    },
    y: {
      title: {
        display: true,
        text: "TIR (%)",
        color: isDark.value ? "#4a6058" : "#9c9086",
        font: { family: "JetBrains Mono", size: 10 },
        padding: { bottom: 8 },
      },
      grid: {
        color: isDark.value ? "rgba(42,51,48,0.8)" : "rgba(214,207,192,0.6)",
      },
      ticks: {
        color: isDark.value ? "#4a6058" : "#9c9086",
        font: { family: "JetBrains Mono", size: 10 },
        callback: (val: number | string) => `${Number(val).toFixed(1)}%`,
      },
    },
  },
}));
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
