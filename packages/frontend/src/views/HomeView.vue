<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { CompareEntry, FxRates } from "@investor-app/shared";
import type { Instrument } from "@investor-app/shared";
import { fetchCompare, fetchInstruments, fetchFxRates } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import YieldCurveChart from "@/components/charts/YieldCurveChart.vue";

const authStore = useAuthStore();
const router = useRouter();

const fxRates = ref<FxRates | null>(null);
const fxLoading = ref(true);

const previewEntries = ref<CompareEntry[]>([]);
const previewLoading = ref(true);

onMounted(async () => {
  // FX rates — best-effort, public endpoint
  fetchFxRates()
    .then((r) => {
      fxRates.value = r;
    })
    .catch(() => {})
    .finally(() => {
      fxLoading.value = false;
    });

  // Yield curve preview — SOV_USD_EXT (Ley Nueva York)
  try {
    const instruments: Instrument[] = await fetchInstruments();
    const tickers = instruments.filter((i) => i.subtype === "SOV_USD_EXT").map((i) => i.ticker);
    if (tickers.length >= 2) {
      const { entries } = await fetchCompare(tickers);
      previewEntries.value = entries;
    }
  } catch {
    // silent
  } finally {
    previewLoading.value = false;
  }
});

function login() {
  authStore.loginWithGoogle();
}

function goToApp() {
  router.push("/bonos");
}

function onChartPointClick(ticker: string) {
  router.push(`/instrument/${ticker}`);
}

const FX_LABELS: Record<string, string> = {
  "ARS/USD_OFFICIAL": "Oficial",
  "ARS/USD_BLUE": "Blue",
  "ARS/USD_MEP": "MEP",
  "ARS/USD_CCL": "CCL",
};
</script>

<template>
  <div class="home">
    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-brand">
        <span class="logo-mark">▲</span>
        <span class="logo-text">Inversor<span class="logo-accent">AR</span></span>
      </div>
      <h1 class="hero-headline">Análisis profesional de<br />renta fija argentina</h1>
      <p class="hero-sub">
        TIR, duration, paridad y flujos de caja para bonos, letras y obligaciones negociables del
        mercado local.
      </p>
      <div class="hero-actions">
        <button v-if="!authStore.isAuthenticated" class="btn-primary" @click="login">
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Ingresar con Google
        </button>
        <button v-else class="btn-primary" @click="goToApp">Ir a la plataforma →</button>
      </div>
    </section>

    <!-- ── FX Rates ──────────────────────────────────────────────────────── -->
    <section class="fx-section">
      <h2 class="section-label">Cotización del dólar</h2>
      <div class="fx-grid">
        <template v-if="fxLoading">
          <div v-for="n in 4" :key="n" class="fx-card card skeleton-card">
            <div class="skeleton" style="width: 48px; height: 12px; margin-bottom: 0.5rem" />
            <div class="skeleton" style="width: 80px; height: 24px" />
          </div>
        </template>
        <template v-else-if="fxRates">
          <div
            v-for="rate in [fxRates.official, fxRates.blue, fxRates.mep, fxRates.ccl]"
            :key="rate.pair"
            class="fx-card card"
          >
            <p class="fx-label">{{ FX_LABELS[rate.pair] ?? rate.pair }}</p>
            <p class="fx-value font-mono">
              ${{
                rate.sell.toLocaleString("es-AR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }}
            </p>
            <div class="fx-spread font-mono">
              <span class="fx-buy"
                >C ${{
                  rate.buy.toLocaleString("es-AR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                }}</span
              >
              <span class="fx-sell"
                >V ${{
                  rate.sell.toLocaleString("es-AR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                }}</span
              >
            </div>
          </div>
        </template>
        <template v-else>
          <div class="fx-unavailable">Cotizaciones no disponibles.</div>
        </template>
      </div>
    </section>

    <!-- ── Yield curve preview ───────────────────────────────────────────── -->
    <section class="preview-section">
      <h2 class="section-label">Bonos Soberanos USD — Ley Nueva York</h2>
      <p class="section-hint">
        Curva TIR vs. duration. Hacé click en un bono para ver el análisis completo.
      </p>

      <div class="preview-card card">
        <div v-if="previewLoading" class="chart-skeleton">
          <div class="skeleton" style="height: 260px; border-radius: 0.5rem" />
        </div>
        <template v-else-if="previewEntries.length >= 2">
          <YieldCurveChart
            :entries="previewEntries"
            :clickable="true"
            @point-click="onChartPointClick"
          />
        </template>
        <div v-else class="preview-unavailable">Datos no disponibles en este momento.</div>

        <p class="preview-cta-hint">
          Ingresá para acceder al análisis completo, simulaciones, comparador y curvas de todos los
          segmentos.
        </p>
      </div>
    </section>

    <!-- ── Features ───────────────────────────────────────────────────────── -->
    <section class="features">
      <div class="feature-card card">
        <div class="feature-icon">◈</div>
        <h3 class="feature-title">Análisis completo</h3>
        <p class="feature-desc">
          TIR, TNA, TEM, duration modificada, precio limpio/sucio, paridad y tabla de flujos de caja
          para cada instrumento.
        </p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon">⌇</div>
        <h3 class="feature-title">Curvas de rendimiento</h3>
        <p class="feature-desc">
          Visualización de la curva TIR vs. duration para cada categoría: soberanos USD, LECAP,
          LECER, bonos CER, sub-soberanos y ONs.
        </p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon">⇄</div>
        <h3 class="feature-title">Comparador</h3>
        <p class="feature-desc">
          Compará hasta 10 instrumentos simultáneamente, ordenados por TIR descendente, con todas
          sus métricas en una sola tabla.
        </p>
      </div>
      <div class="feature-card card">
        <div class="feature-icon">◳</div>
        <h3 class="feature-title">Portafolio</h3>
        <p class="feature-desc">
          Armá tu cartera y seguí el calendario de cobros consolidado: cupones y amortizaciones mes
          a mes de todos tus instrumentos.
        </p>
      </div>
    </section>

    <!-- ── Bottom CTA ─────────────────────────────────────────────────────── -->
    <section v-if="!authStore.isAuthenticated" class="bottom-cta">
      <p class="bottom-cta-text">24 horas de acceso gratuito. Sin tarjeta de crédito.</p>
      <button class="btn-primary" @click="login">
        <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Ingresar con Google
      </button>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  padding-top: 2rem;
}

/* ── Hero ──────────────────────────────────────────────────────────────────── */

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  padding: 3rem 1rem 1rem;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  letter-spacing: -0.02em;
}

.logo-mark {
  color: var(--color-accent);
}
.logo-accent {
  color: var(--color-accent);
}

.hero-headline {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--color-text-primary);
  margin: 0;
}

.hero-sub {
  max-width: 520px;
  color: var(--color-text-secondary);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.hero-actions {
  margin-top: 0.5rem;
}

/* ── Button ────────────────────────────────────────────────────────────────── */

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}
.btn-primary:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-sunken);
  color: var(--color-accent);
}

.google-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* ── Section labels ────────────────────────────────────────────────────────── */

.section-label {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin: 0 0 0.75rem;
  text-align: center;
}

.section-hint {
  font-size: 0.78rem;
  color: var(--color-text-dim);
  text-align: center;
  margin: -0.5rem 0 0.75rem;
}

/* ── FX rates ──────────────────────────────────────────────────────────────── */

.fx-section {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}

.fx-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.fx-card {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.skeleton-card {
  min-height: 72px;
}

.fx-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.fx-value {
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.fx-spread {
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  margin-top: 0.125rem;
}

.fx-buy {
  color: var(--color-text-dim);
}
.fx-sell {
  color: var(--color-text-dim);
}

.fx-unavailable {
  grid-column: 1 / -1;
  text-align: center;
  padding: 1.5rem;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

/* ── Yield curve preview ───────────────────────────────────────────────────── */

.preview-section {
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.preview-card {
  padding: 1.5rem;
  overflow: hidden;
}

.chart-skeleton {
  padding: 0.5rem;
}

.preview-unavailable {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.preview-cta-hint {
  padding: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-dim);
  text-align: center;
  margin: 0;
  border-top: 1px solid var(--color-border-dim);
  margin-top: 1rem;
}

/* ── Features ──────────────────────────────────────────────────────────────── */

.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.feature-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.feature-icon {
  font-size: 1.4rem;
  color: var(--color-accent);
  line-height: 1;
}

.feature-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
}

.feature-desc {
  font-size: 0.83rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ── Bottom CTA ────────────────────────────────────────────────────────────── */

.bottom-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem 1rem;
}

.bottom-cta-text {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin: 0;
}

/* ── Responsive ────────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .home {
    gap: 3rem;
  }
  .hero {
    padding-top: 1.5rem;
  }
  .features {
    grid-template-columns: 1fr;
  }
  .fx-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
