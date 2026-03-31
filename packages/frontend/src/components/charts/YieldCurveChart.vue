<script setup lang="ts">
import { computed } from "vue";
import { Scatter } from "vue-chartjs";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartDataset,
  type ChartData,
  type ChartOptions,
  type Point,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { CompareEntry } from "@investor-app/shared";
import { formatYield, formatTimeToMaturity } from "@/composables/useFormat";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, ChartDataLabels);

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

/** Color per instrument index (dots) */
const COLORS = [
  { border: "#f59e0b", bg: "rgba(245,158,11,0.85)" },
  { border: "#22c55e", bg: "rgba(34,197,94,0.85)" },
  { border: "#60a5fa", bg: "rgba(96,165,250,0.85)" },
  { border: "#a78bfa", bg: "rgba(167,139,250,0.85)" },
  { border: "#fb7185", bg: "rgba(251,113,133,0.85)" },
  { border: "#34d399", bg: "rgba(52,211,153,0.85)" },
  { border: "#f472b6", bg: "rgba(244,114,182,0.85)" },
  { border: "#fbbf24", bg: "rgba(251,191,36,0.85)" },
];

/** Color per subtype curve */
const SUBTYPE_CURVE_COLORS: Record<string, string> = {
  SOV_USD_ARG: "rgba(96,165,250,0.8)",
  SOV_USD_EXT: "rgba(167,139,250,0.8)",
  LECAP:       "rgba(251,191,36,0.8)",
  BONCAP:      "rgba(245,158,11,0.8)",
  LECER:       "rgba(52,211,153,0.8)",
  TASA_CER:    "rgba(34,197,94,0.8)",
  BON_CER:     "rgba(16,185,129,0.8)",
  ON:          "rgba(251,113,133,0.8)",
};

/** Point shape by instrument type */
const TYPE_SHAPES: Record<string, "circle" | "triangle" | "rect"> = {
  BOND: "circle",
  ON: "triangle",
  LETTER: "rect",
};

const chartData = computed((): ChartData<"scatter", Point[]> => {
  // Group entries by subtype for per-subtype curve fitting
  const bySubtype = new Map<string, typeof props.entries>();
  for (const entry of props.entries) {
    const key = entry.subtype;
    if (!bySubtype.has(key)) bySubtype.set(key, []);
    bySubtype.get(key)!.push(entry);
  }

  const defaultCurveColor = isDark.value ? "rgba(120,190,150,0.7)" : "rgba(60,120,80,0.6)";
  const STEPS = 80;

  const curveDatasets: ChartDataset<"scatter", Point[]>[] = [];

  for (const [subtype, group] of bySubtype) {
    if (group.length < 2) continue;
    const pts = group.map((e) => ({
      x: e.calculations.modifiedDuration,
      y: e.calculations.ytm * 100,
    }));
    const degree = pts.length >= 3 ? 2 : 1;
    const coeffs = polyFit(pts, degree);
    const xs = pts.map((p) => p.x);
    const xMin = Math.min(...xs) - 0.2;
    const xMax = Math.max(...xs) + 0.2;
    const fittedPoints = Array.from({ length: STEPS + 1 }, (_, i) => {
      const x = xMin + (i / STEPS) * (xMax - xMin);
      return { x, y: evalPoly(coeffs, x) };
    });
    const color = SUBTYPE_CURVE_COLORS[subtype] ?? defaultCurveColor;
    curveDatasets.push({
      label: `__curve__${subtype}`,
      data: fittedPoints,
      showLine: true,
      tension: 0,
      borderColor: color,
      borderWidth: 2,
      backgroundColor: "transparent",
      fill: false,
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

  return { datasets: [...curveDatasets, ...pointDatasets] };
});

/** Active subtype curves (≥2 points) with their assigned color, for the legend. */
const subtypeLegend = computed(() => {
  const counts = new Map<string, number>();
  for (const e of props.entries) {
    counts.set(e.subtype, (counts.get(e.subtype) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .map(([subtype]) => ({
      subtype,
      color: SUBTYPE_CURVE_COLORS[subtype] ?? "rgba(120,190,150,0.7)",
    }));
});

const chartOptions = computed((): ChartOptions<"scatter"> => ({
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
      filter: (item: { dataset: { label?: string } }) => !item.dataset.label?.startsWith("__curve__"),
      backgroundColor: isDark.value ? "#141918" : "#faf7f2",
      borderColor: isDark.value ? "#2a3330" : "#d6cfc0",
      borderWidth: 1,
      titleColor: isDark.value ? "#e8ede8" : "#1a1612",
      bodyColor: isDark.value ? "#7a9488" : "#6b6256",
      titleFont: { family: "JetBrains Mono", size: 12, weight: 600 },
      bodyFont: { family: "JetBrains Mono", size: 11 },
      padding: 12,
      callbacks: {
        title: (items: { dataset: { label?: string } }[]) => {
          const ticker = items[0]?.dataset.label;
          if (!ticker || ticker.startsWith("__curve__")) return "";
          const entry = props.entries.find((e) => e.ticker === ticker);
          return entry ? `${entry.ticker} — ${entry.type}` : "";
        },
        label: (ctx: { dataset: { label?: string } }) => {
          const ticker = ctx.dataset.label;
          if (!ticker || ticker.startsWith("__curve__")) return "";
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
        if (!ticker || ticker.startsWith("__curve__")) return "";
        return ticker;
      },
      color: isDark.value ? "#e8ede8" : "#1a1612",
      font: {
        family: "JetBrains Mono",
        size: 11,
        weight: 600,
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
        callback: (val: number | string) => {
          const n = Number(val);
          return n < 1 ? n.toFixed(2) : n.toFixed(1);
        },
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
    <!-- Curve legend by subtype -->
    <div v-if="subtypeLegend.length > 1" class="curve-legend">
      <span v-for="item in subtypeLegend" :key="item.subtype" class="legend-item">
        <span class="curve-swatch" :style="{ background: item.color }" />
        {{ item.subtype }}
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

.curve-legend {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 0.25rem;
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

.curve-swatch {
  display: inline-block;
  width: 20px;
  height: 2px;
  border-radius: 1px;
}
</style>
