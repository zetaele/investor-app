import type {
  CompareEntry,
  FxRates,
  Instrument,
  Cashflow,
  InstrumentAnalysis,
  SimulationResult,
  Currency,
  InstrumentType,
} from "@investor-app/shared";

const BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "/api/v1";

// ── HTTP helper ───────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);

  if (params !== undefined) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, (body as { error: string }).error ?? "Unknown error");
  }

  return response.json() as Promise<T>;
}

// ── Instruments ───────────────────────────────────────────────────────────────

/** Simulates bond metrics at a hypothetical price or YTM. */
export async function fetchSimulation(
  ticker: string,
  input: { price: number } | { ytm: number },
  displayCurrency: Currency = "USD",
): Promise<SimulationResult> {
  const params: Record<string, string> = { displayCurrency };
  if ("price" in input) {
    params["price"] = String(input.price);
  } else {
    params["ytm"] = String(input.ytm);
  }
  const res = await get<{ data: SimulationResult }>(`/instruments/${ticker}/simulate`, params);
  return res.data;
}

/** Returns all active instruments, optionally filtered. */
export async function fetchInstruments(filters?: {
  type?: InstrumentType;
  currency?: Currency;
}): Promise<Instrument[]> {
  const params: Record<string, string> = {};
  if (filters?.type !== undefined) params["type"] = filters.type;
  if (filters?.currency !== undefined) params["currency"] = filters.currency;

  const res = await get<{ data: Instrument[] }>("/instruments", params);
  return res.data;
}

/** Returns static data for a single instrument. */
export async function fetchInstrument(ticker: string): Promise<Instrument> {
  const res = await get<{ data: Instrument }>(`/instruments/${ticker}`);
  return res.data;
}

/** Returns all scheduled cash flows for an instrument. */
export async function fetchCashflows(ticker: string): Promise<Cashflow[]> {
  const res = await get<{ data: Cashflow[] }>(`/instruments/${ticker}/cashflows`);
  return res.data;
}

/** Returns the full financial analysis for an instrument. */
export async function fetchAnalysis(
  ticker: string,
  displayCurrency: Currency = "USD",
): Promise<InstrumentAnalysis> {
  const res = await get<{ data: InstrumentAnalysis }>(`/instruments/${ticker}/analysis`, {
    displayCurrency,
  });
  return res.data;
}

// ── Compare ───────────────────────────────────────────────────────────────────

/** Returns a side-by-side analysis for 2–5 instruments. */
export async function fetchCompare(
  tickers: string[],
  displayCurrency: Currency = "USD",
): Promise<{ entries: CompareEntry[]; failed?: string[] }> {
  const res = await get<{ data: CompareEntry[]; failed?: string[] }>("/compare", {
    tickers: tickers.join(","),
    displayCurrency,
  });
  return { entries: res.data, failed: res.failed };
}

// ── FX ────────────────────────────────────────────────────────────────────────

/** Returns the latest ARS/USD exchange rates. */
export async function fetchFxRates(): Promise<FxRates> {
  const res = await get<{ data: FxRates }>("/fx/rates");
  return res.data;
}

export interface CalendarPayment {
  paymentDate: string;
  ticker: string;
  instrumentName: string;
  instrumentType: "BOND" | "LETTER" | "ON";
  currency: "ARS" | "USD" | "USD_LINKED";
  coupon: number;
  amortization: number;
  totalFlow: number;
  residualAfter: number;
}

export interface CalendarMonth {
  month: string;
  label: string;
  payments: CalendarPayment[];
}

export async function fetchCalendar(daysAhead = 730): Promise<CalendarMonth[]> {
  const res = await get<{ data: CalendarMonth[] }>("/calendar", {
    days: String(daysAhead),
  });
  return res.data;
}

export { ApiError };
