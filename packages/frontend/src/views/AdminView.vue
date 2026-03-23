<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { FlowGeneratorParams } from "@investor-app/shared";
import { fetchInstruments } from "@/services/api";
import type { Instrument } from "@investor-app/shared";
import { formatDate } from "@/composables/useFormat";
import {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  verifyAdminToken,
  adminCreateInstrument,
  adminDeactivateInstrument,
  adminPreviewFlows,
  AdminApiError,
} from "@/services/adminApi";
import type { GeneratedCashflow, FlowType } from "@/services/adminTypes";
import {
  FLOW_TYPE_LABELS,
  FLOW_TYPE_DESCRIPTIONS,
} from "@/services/adminTypes";

const router = useRouter();

// ── Auth ──────────────────────────────────────────────────────────────────────

const isAuthenticated = ref(false);
const tokenInput = ref("");
const authError = ref("");
const authLoading = ref(false);

async function login(): Promise<void> {
  authLoading.value = true;
  authError.value = "";
  setAdminToken(tokenInput.value.trim());
  const valid = await verifyAdminToken();
  if (valid) {
    isAuthenticated.value = true;
    loadInstruments();
  } else {
    clearAdminToken();
    authError.value = "Token inválido.";
  }
  authLoading.value = false;
}

function logout(): void {
  clearAdminToken();
  isAuthenticated.value = false;
  tokenInput.value = "";
}

onMounted(async () => {
  if (getAdminToken() !== null) {
    const valid = await verifyAdminToken();
    if (valid) {
      isAuthenticated.value = true;
      loadInstruments();
    } else {
      clearAdminToken();
    }
  }
});

// ── Instrument list ───────────────────────────────────────────────────────────

const instruments = ref<Instrument[]>([]);
const listLoading = ref(false);
const listError = ref<string | null>(null);

async function loadInstruments(): Promise<void> {
  listLoading.value = true;
  listError.value = null;
  try {
    instruments.value = await fetchInstruments();
  } catch {
    listError.value = "Error al cargar instrumentos.";
  } finally {
    listLoading.value = false;
  }
}

async function deactivate(ticker: string): Promise<void> {
  if (!confirm(`¿Desactivar ${ticker}?`)) return;
  try {
    await adminDeactivateInstrument(ticker);
    await loadInstruments();
  } catch (err) {
    alert(err instanceof AdminApiError ? err.message : "Error al desactivar.");
  }
}

// ── Form ──────────────────────────────────────────────────────────────────────

const showForm = ref(false);
const formError = ref<string | null>(null);
const formSuccess = ref<string | null>(null);
const formLoading = ref(false);

const form = ref({
  ticker: "",
  name: "",
  type: "BOND" as "BOND" | "LETTER" | "ON",
  flowType: "BULLET" as FlowType,
  currency: "USD" as "ARS" | "USD" | "USD_LINKED",
  issuer: "",
  issueDate: "",
  maturityDate: "",
  // Coupon params
  couponRate: "",
  couponFrequency: "2",
  firstCouponDate: "",
  couponScheduleRaw: "", // Optional: explicit coupon dates JSON
  // Capitalizable
  capitalizationRate: "",
  // Adjustment
  adjustmentCoefficient: "",
  // Amortizable
  amortScheduleRaw: "",
});

function resetForm(): void {
  form.value = {
    ticker: "",
    name: "",
    type: "BOND",
    flowType: "BULLET",
    currency: "USD",
    issuer: "",
    issueDate: "",
    maturityDate: "",
    couponRate: "",
    couponFrequency: "2",
    firstCouponDate: "",
    couponScheduleRaw: "",
    capitalizationRate: "",
    adjustmentCoefficient: "",
    amortScheduleRaw: "",
  };
  previewResult.value = null;
  formError.value = null;
  formSuccess.value = null;
}

const needsCoupon = computed(() =>
  ["BULLET", "AMORTIZABLE", "CER", "USD_LINKED"].includes(form.value.flowType),
);
const needsAmortSchedule = computed(
  () => form.value.flowType === "AMORTIZABLE",
);
const needsCapRate = computed(() => form.value.flowType === "CAPITALIZABLE");

// ── Flow preview ──────────────────────────────────────────────────────────────

const previewResult = ref<{
  data: GeneratedCashflow[];
  count: number;
  totalCoupon: number;
  totalAmortization: number;
} | null>(null);
const previewLoading = ref(false);
const previewError = ref<string | null>(null);

function buildFlowParams(): FlowGeneratorParams | null {
  const f = form.value;
  if (!f.issueDate || !f.maturityDate) return null;

  const base: FlowGeneratorParams = {
    flowType: f.flowType,
    issueDate: f.issueDate,
    maturityDate: f.maturityDate,
    faceValue: 100,
  };

  if (needsCoupon.value) {
    if (f.couponRate) {
      base.couponRate = parseFloat(f.couponRate) / 100;
      base.couponFrequency = parseInt(f.couponFrequency);
    }
    if (f.couponScheduleRaw.trim()) {
      try {
        base.couponSchedule = JSON.parse(f.couponScheduleRaw);
      } catch {
        return null;
      }
    }
    if (!base.couponSchedule && f.firstCouponDate) {
      base.firstCouponDate = f.firstCouponDate;
    }
  }

  if (needsAmortSchedule.value && f.amortScheduleRaw.trim()) {
    try {
      base.amortizationSchedule = JSON.parse(f.amortScheduleRaw);
    } catch {
      return null;
    }
  }

  if (needsCapRate.value && f.capitalizationRate) {
    base.capitalizationRate = parseFloat(f.capitalizationRate) / 100;
    base.couponFrequency = parseInt(f.couponFrequency);
  }

  if (f.adjustmentCoefficient) {
    base.adjustmentCoefficient = parseFloat(f.adjustmentCoefficient);
  }

  return base;
}

async function runPreview(): Promise<void> {
  const params = buildFlowParams();
  if (params === null) {
    previewError.value =
      "Completá los campos requeridos antes de previsualizar.";
    return;
  }

  previewLoading.value = true;
  previewError.value = null;
  previewResult.value = null;

  try {
    previewResult.value = await adminPreviewFlows(params);
  } catch (err) {
    previewError.value =
      err instanceof AdminApiError ? err.message : "Error al previsualizar.";
  } finally {
    previewLoading.value = false;
  }
}

// Reset preview when key fields change
watch(
  () => [
    form.value.flowType,
    form.value.issueDate,
    form.value.maturityDate,
    form.value.couponRate,
    form.value.couponFrequency,
    form.value.firstCouponDate,
    form.value.couponScheduleRaw,
    form.value.capitalizationRate,
    form.value.amortScheduleRaw,
  ],
  () => {
    previewResult.value = null;
  },
);

// ── Submit ────────────────────────────────────────────────────────────────────

async function submit(): Promise<void> {
  formError.value = null;
  formSuccess.value = null;

  const params = buildFlowParams();
  if (params === null) {
    formError.value = "Completá los campos requeridos para generar los flujos.";
    return;
  }

  formLoading.value = true;
  try {
    const result = await adminCreateInstrument({
      ticker: form.value.ticker.toUpperCase(),
      name: form.value.name,
      type: form.value.type,
      flowType: form.value.flowType,
      currency: form.value.currency,
      issuer: form.value.issuer || undefined,
      maturityDate: form.value.maturityDate,
      flowParams: params,
    });
    formSuccess.value = `✓ ${result.ticker} creado con ${result.flowCount} flujos de pago.`;
    resetForm();
    showForm.value = false;
    await loadInstruments();
  } catch (err) {
    formError.value =
      err instanceof AdminApiError
        ? err.message
        : "Error al crear el instrumento.";
  } finally {
    formLoading.value = false;
  }
}
</script>

<template>
  <div class="admin-view">
    <!-- Login screen -->
    <div v-if="!isAuthenticated" class="login-screen">
      <div class="login-card card">
        <h1 class="font-display login-title">Admin</h1>
        <p class="login-subtitle">Ingresá tu token de acceso para continuar.</p>
        <div class="login-form">
          <input
            v-model="tokenInput"
            class="field-input"
            type="password"
            placeholder="Token de admin"
            @keyup.enter="login"
          />
          <button
            class="btn-primary"
            :disabled="authLoading || !tokenInput"
            @click="login"
          >
            {{ authLoading ? "Verificando..." : "Ingresar" }}
          </button>
        </div>
        <p v-if="authError" class="form-error">{{ authError }}</p>
      </div>
    </div>

    <!-- Admin panel -->
    <template v-else>
      <header class="admin-header">
        <div>
          <h1 class="admin-title font-display">Panel de administración</h1>
          <p class="admin-subtitle">Gestión de instrumentos financieros</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="router.push('/')">
            ← Volver al sitio
          </button>
          <button class="btn-danger-outline" @click="logout">
            Cerrar sesión
          </button>
        </div>
      </header>

      <div v-if="formSuccess" class="success-banner">{{ formSuccess }}</div>

      <!-- Instrument list -->
      <section class="admin-section">
        <div class="section-header">
          <h2 class="section-title font-display">Instrumentos</h2>
          <button
            class="btn-primary"
            @click="
              showForm = !showForm;
              resetForm();
            "
          >
            {{ showForm ? "✕ Cancelar" : "+ Nuevo instrumento" }}
          </button>
        </div>

        <div v-if="listLoading" class="state-msg">Cargando...</div>
        <div v-else-if="listError" class="form-error">{{ listError }}</div>

        <div v-else class="table-wrapper card">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Flujo</th>
                <th>Moneda</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in instruments" :key="i.ticker" class="table-row">
                <td class="font-mono ticker-cell">{{ i.ticker }}</td>
                <td class="name-cell">{{ i.name }}</td>
                <td>
                  <span class="type-badge" :data-type="i.type">{{
                    i.type
                  }}</span>
                </td>
                <td class="font-mono text-sm">{{ i.type }}</td>
                <td class="font-mono text-sm">{{ i.currency }}</td>
                <td class="font-mono text-sm">
                  {{ formatDate(i.maturityDate) }}
                </td>
                <td>
                  <span
                    class="status-badge"
                    :class="i.isActive ? 'active' : 'inactive'"
                  >
                    {{ i.isActive ? "Activo" : "Inactivo" }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="i.isActive"
                    class="btn-danger-sm"
                    @click="deactivate(i.ticker)"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Creation form -->
      <section v-if="showForm" class="admin-section form-section">
        <h2 class="section-title font-display">Nuevo instrumento</h2>

        <div class="form-grid">
          <div class="form-group">
            <label class="field-label">Ticker *</label>
            <input
              v-model="form.ticker"
              class="field-input"
              placeholder="Ej: GD46"
            />
          </div>

          <div class="form-group form-group--wide">
            <label class="field-label">Nombre completo *</label>
            <input
              v-model="form.name"
              class="field-input"
              placeholder="Ej: Bono del Tesoro en Dólares 2046 (Ley Nueva York)"
            />
          </div>

          <div class="form-group">
            <label class="field-label">Tipo de instrumento *</label>
            <select v-model="form.type" class="field-input">
              <option value="BOND">Bono</option>
              <option value="LETTER">Letra</option>
              <option value="ON">Obligación Negociable</option>
            </select>
          </div>

          <div class="form-group">
            <label class="field-label">Moneda *</label>
            <select v-model="form.currency" class="field-input">
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
              <option value="USD_LINKED">USD-linked</option>
            </select>
          </div>

          <div class="form-group form-group--wide">
            <label class="field-label">Emisor</label>
            <input
              v-model="form.issuer"
              class="field-input"
              placeholder="Ej: Tesoro Nacional"
            />
          </div>

          <div class="form-group">
            <label class="field-label">Fecha de emisión *</label>
            <input v-model="form.issueDate" class="field-input" type="date" />
          </div>

          <div class="form-group">
            <label class="field-label">Fecha de vencimiento *</label>
            <input
              v-model="form.maturityDate"
              class="field-input"
              type="date"
            />
          </div>

          <!-- Flow type selector -->
          <div class="form-group form-group--full">
            <label class="field-label">Estructura de flujo *</label>
            <div class="flow-type-grid">
              <button
                v-for="(label, type) in FLOW_TYPE_LABELS"
                :key="type"
                class="flow-type-btn"
                :class="{ active: form.flowType === type }"
                @click="form.flowType = type as FlowType"
              >
                <span class="flow-type-name">{{ label }}</span>
                <span class="flow-type-desc">{{
                  FLOW_TYPE_DESCRIPTIONS[type as FlowType]
                }}</span>
              </button>
            </div>
          </div>

          <!-- Coupon fields -->
          <template v-if="needsCoupon">
            <div class="form-group">
              <label class="field-label">Tasa de cupón anual (%)</label>
              <input
                v-model="form.couponRate"
                class="field-input"
                type="number"
                step="0.01"
                placeholder="Ej: 8.5"
              />
            </div>
            <div class="form-group">
              <label class="field-label">Frecuencia de pago</label>
              <select v-model="form.couponFrequency" class="field-input">
                <option value="1">Anual</option>
                <option value="2">Semestral</option>
                <option value="4">Trimestral</option>
                <option value="12">Mensual</option>
              </select>
            </div>
            <div class="form-group">
              <label class="field-label"> Fecha primer cupón </label>
              <input
                v-model="form.firstCouponDate"
                class="field-input"
                type="date"
              />
            </div>
            <div class="form-group form-group--full">
              <label class="field-label">
                Fechas exactas de cupón — JSON (opcional)
                <span class="field-hint">
                  Para calendarios irregulares (feriados, fin de mes).
                  Sobreescribe la generación automática. Formato:
                  [{"date":"2026-03-31"},{"date":"2026-09-30"},{"date":"2027-03-31"}]
                </span>
              </label>
              <textarea
                v-model="form.couponScheduleRaw"
                class="field-input field-textarea"
                placeholder='Dejar vacío para generar automáticamente desde "Fecha primer cupón"'
                rows="3"
              />
            </div>
          </template>

          <!-- Capitalizable fields -->
          <template v-if="needsCapRate">
            <div class="form-group">
              <label class="field-label">TNA de capitalización (%) *</label>
              <input
                v-model="form.capitalizationRate"
                class="field-input"
                type="number"
                step="0.01"
                placeholder="Ej: 45"
              />
            </div>
            <div class="form-group">
              <label class="field-label">Frecuencia de capitalización *</label>
              <select v-model="form.couponFrequency" class="field-input">
                <option value="1">Anual</option>
                <option value="2">Semestral</option>
                <option value="4">Trimestral</option>
                <option value="12">Mensual</option>
              </select>
            </div>
          </template>

          <!-- Amortizable schedule -->
          <template v-if="needsAmortSchedule">
            <div class="form-group form-group--full">
              <label class="field-label">
                Schedule de amortización — JSON *
                <span class="field-hint">
                  Array de {date, pct}. La suma de pct debe ser exactamente 1.
                  Ej:
                  [{"date":"2027-01-09","pct":0.16},{"date":"2027-07-09","pct":0.84}]
                </span>
              </label>
              <textarea
                v-model="form.amortScheduleRaw"
                class="field-input field-textarea"
                placeholder='[{"date":"2027-01-09","pct":0.16},{"date":"2027-07-09","pct":0.16}]'
                rows="4"
              />
            </div>
          </template>

          <!-- CER / USD_LINKED adjustment -->
          <template
            v-if="form.flowType === 'CER' || form.flowType === 'USD_LINKED'"
          >
            <div class="form-group">
              <label class="field-label">
                Coeficiente de ajuste
                <span class="field-hint">{{
                  form.flowType === "CER"
                    ? "Coeficiente CER actual"
                    : "TC oficial actual (ARS/USD)"
                }}</span>
              </label>
              <input
                v-model="form.adjustmentCoefficient"
                class="field-input"
                type="number"
                step="0.01"
              />
            </div>
          </template>
        </div>

        <!-- Preview -->
        <div class="preview-section">
          <div class="preview-header">
            <h3 class="preview-title">Preview de flujos</h3>
            <button
              class="btn-secondary"
              :disabled="previewLoading"
              @click="runPreview"
            >
              {{ previewLoading ? "Calculando..." : "Previsualizar flujos" }}
            </button>
          </div>

          <p v-if="previewError" class="form-error">{{ previewError }}</p>

          <div v-if="previewResult" class="preview-result">
            <div class="preview-summary">
              <span class="font-mono">{{ previewResult.count }} flujos</span>
              <span class="font-mono"
                >Cupones totales:
                {{ previewResult.totalCoupon.toFixed(4) }}</span
              >
              <span class="font-mono"
                >Amortización total:
                {{ previewResult.totalAmortization.toFixed(2) }}</span
              >
            </div>
            <div class="table-wrapper card">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th class="text-right">Cupón</th>
                    <th class="text-right">Amortización</th>
                    <th class="text-right">Flujo total</th>
                    <th class="text-right">Residual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="cf in previewResult.data"
                    :key="cf.paymentDate"
                    class="table-row"
                  >
                    <td class="font-mono">{{ formatDate(cf.paymentDate) }}</td>
                    <td
                      class="font-mono text-right"
                      style="color: var(--color-accent)"
                    >
                      {{ cf.coupon > 0 ? cf.coupon.toFixed(4) : "—" }}
                    </td>
                    <td
                      class="font-mono text-right"
                      style="color: var(--color-positive)"
                    >
                      {{
                        cf.amortization > 0 ? cf.amortization.toFixed(2) : "—"
                      }}
                    </td>
                    <td class="font-mono text-right">
                      {{ (cf.coupon + cf.amortization).toFixed(4) }}
                    </td>
                    <td class="font-mono text-right">
                      {{ (cf.residual * 100).toFixed(0) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Form actions -->
        <div class="form-actions">
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <button
            class="btn-secondary"
            @click="
              showForm = false;
              resetForm();
            "
          >
            Cancelar
          </button>
          <button
            class="btn-primary"
            :disabled="formLoading || !previewResult"
            @click="submit"
          >
            {{ formLoading ? "Guardando..." : "Crear instrumento" }}
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 1rem;
}

.login-screen {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-title {
  font-size: 2rem;
  font-weight: 400;
  margin: 0;
}

.login-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
}

.admin-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  margin: 0 0 0.25rem;
}

.admin-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.success-banner {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: var(--color-positive);
  font-size: 0.875rem;
}

.admin-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
}

.table-wrapper {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.admin-table thead tr {
  border-bottom: 2px solid var(--color-border);
}

.admin-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dim);
  white-space: nowrap;
}

.admin-table th.text-right {
  text-align: right;
}

.table-row {
  border-bottom: 1px solid var(--color-border-dim);
  transition: background var(--transition-base);
}
.table-row:last-child {
  border-bottom: none;
}
.table-row:hover td {
  background: var(--color-bg-sunken);
}

.admin-table td {
  padding: 0.75rem 1rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.admin-table td.text-right {
  text-align: right;
}
.admin-table td.text-sm {
  font-size: 0.78rem;
}

.ticker-cell {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
}
.name-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.2rem 0.45rem;
  border-radius: 0.2rem;
  text-transform: uppercase;
}
.type-badge[data-type="BOND"] {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
}
.type-badge[data-type="LETTER"] {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}
.type-badge[data-type="ON"] {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 2rem;
  letter-spacing: 0.05em;
}
.status-badge.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}
.status-badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.form-section {
  border-top: 1px solid var(--color-border);
  padding-top: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.form-group--wide {
  grid-column: span 2;
}
.form-group--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-dim);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.field-hint {
  font-size: 0.68rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-dim);
}

.field-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-sunken);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition-base);
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus {
  border-color: var(--color-accent);
}

.field-textarea {
  resize: vertical;
  font-family: var(--font-mono);
  font-size: 0.78rem;
}

.flow-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.flow-type-btn {
  all: unset;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-base);
  box-sizing: border-box;
}
.flow-type-btn:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}
.flow-type-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}
.flow-type-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.flow-type-btn.active .flow-type-name {
  color: var(--color-accent);
}
.flow-type-desc {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  line-height: 1.4;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: var(--color-bg-sunken);
  border: 1px solid var(--color-border-dim);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.preview-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.preview-summary {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
  flex-wrap: wrap;
}

.form-error {
  color: var(--color-negative);
  font-size: 0.82rem;
  margin: 0;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: none;
  background: var(--color-accent);
  color: #000;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-base);
}
.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-primary:not(:disabled):hover {
  opacity: 0.85;
}

.btn-secondary {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-secondary:not(:disabled):hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-danger-outline {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: transparent;
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}
.btn-danger-outline:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-danger-sm {
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: transparent;
  color: #ef4444;
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
}
.btn-danger-sm:hover {
  background: rgba(239, 68, 68, 0.1);
}

.state-msg {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  padding: 1rem 0;
}
</style>
