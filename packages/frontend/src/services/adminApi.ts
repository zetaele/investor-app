import type { FlowGeneratorParams } from "@investor-app/shared";
import type { GeneratedCashflow } from "./adminTypes";

const BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "/api/v1";

// ── Token management ──────────────────────────────────────────────────────────

export function getAdminToken(): string | null {
  return sessionStorage.getItem("admin_token");
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem("admin_token", token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem("admin_token");
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  if (token === null) throw new AdminApiError(401, "No admin token set");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  // Only set Content-Type if there's a body
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}/admin${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new AdminApiError(
      response.status,
      (body as { error: string }).error ?? "Unknown error",
    );
  }

  return response.json() as Promise<T>;
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/** Verifies the token is valid. */
export async function verifyAdminToken(): Promise<boolean> {
  try {
    await adminFetch("/health");
    return true;
  } catch {
    return false;
  }
}

export interface CreateInstrumentPayload {
  ticker: string;
  name: string;
  type: "BOND" | "LETTER" | "ON";
  flowType: string;
  currency: "ARS" | "USD" | "USD_LINKED";
  market?: string;
  issuer?: string;
  maturityDate: string;
  flowParams: FlowGeneratorParams;
}

export interface UpdateInstrumentPayload {
  name?: string;
  issuer?: string;
  isActive?: boolean;
  flowParams?: FlowGeneratorParams;
}

/** Creates a new instrument with generated cash flows. */
export async function adminCreateInstrument(
  payload: CreateInstrumentPayload,
): Promise<{ id: number; ticker: string; flowCount: number }> {
  const res = await adminFetch<{
    data: { id: number; ticker: string; flowCount: number };
  }>("/instruments", { method: "POST", body: JSON.stringify(payload) });
  return res.data;
}

/** Updates an instrument's metadata or regenerates its cash flows. */
export async function adminUpdateInstrument(
  ticker: string,
  payload: UpdateInstrumentPayload,
): Promise<void> {
  await adminFetch(`/instruments/${ticker}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Soft-deletes an instrument. */
export async function adminDeactivateInstrument(ticker: string): Promise<void> {
  await adminFetch(`/instruments/${ticker}`, { method: "DELETE" });
}

/** Previews cash flows without persisting. */
export async function adminPreviewFlows(params: FlowGeneratorParams): Promise<{
  data: GeneratedCashflow[];
  count: number;
  totalCoupon: number;
  totalAmortization: number;
}> {
  return adminFetch("/instruments/preview-flows", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
