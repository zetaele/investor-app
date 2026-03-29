import type {
  CompareEntry,
  FxRates,
  Instrument,
  Cashflow,
  InstrumentAnalysis,
  SimulationResult,
  InstrumentType,
  PortfolioSummary,
  PortfolioDetail,
  CalendarMonth,
  CalendarPayment,
} from "@investor-app/shared";

export type { CalendarPayment, CalendarMonth, PortfolioSummary, PortfolioDetail };

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

  const response = await fetch(url.toString(), { credentials: "include" });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, (body as { error: string }).error ?? "Unknown error");
  }

  return response.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, (err as { error: string }).error ?? "Unknown error");
  }
  return response.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  const response = await fetch(url.toString(), { method: "DELETE", credentials: "include" });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, (err as { error: string }).error ?? "Unknown error");
  }
}

// ── Instruments ───────────────────────────────────────────────────────────────

/** Simulates bond metrics at a hypothetical price or YTM. */
export async function fetchSimulation(
  ticker: string,
  input: { price: number } | { ytm: number },
  options?: { quantity?: number; settlementDate?: string },
): Promise<SimulationResult> {
  const params: Record<string, string> = {};
  if ("price" in input) {
    params["price"] = String(input.price);
  } else {
    params["ytm"] = String(input.ytm);
  }
  if (options?.quantity !== undefined) params["quantity"] = String(options.quantity);
  if (options?.settlementDate !== undefined) params["settlementDate"] = options.settlementDate;
  const res = await get<{ data: SimulationResult }>(`/instruments/${ticker}/simulate`, params);
  return res.data;
}

/** Returns all active instruments, optionally filtered. */
export async function fetchInstruments(filters?: {
  type?: InstrumentType;
  currency?: string;
}): Promise<Instrument[]> {
  const params: Record<string, string> = {};
  if (filters?.type !== undefined) params["type"] = filters.type;
  if (filters?.currency !== undefined) params["currency"] = filters.currency;

  const res = await get<{ data: Instrument[] }>("/instruments", params);
  return res.data.sort((a, b) => {
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
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
export async function fetchAnalysis(ticker: string): Promise<InstrumentAnalysis> {
  const res = await get<{ data: InstrumentAnalysis }>(`/instruments/${ticker}/analysis`);
  return res.data;
}

// ── Compare ───────────────────────────────────────────────────────────────────

/** Returns a side-by-side analysis for 2–5 instruments. */
export async function fetchCompare(
  tickers: string[],
): Promise<{ entries: CompareEntry[]; failed?: string[] }> {
  const res = await get<{ data: CompareEntry[]; failed?: string[] }>("/compare", {
    tickers: tickers.join(","),
  });
  return { entries: res.data, failed: res.failed };
}

// ── FX ────────────────────────────────────────────────────────────────────────

/** Returns the latest ARS/USD exchange rates. */
export async function fetchFxRates(): Promise<FxRates> {
  const res = await get<{ data: FxRates }>("/fx/rates");
  return res.data;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export async function fetchCalendar(daysAhead = 730): Promise<CalendarMonth[]> {
  const res = await get<{ data: CalendarMonth[] }>("/calendar", {
    days: String(daysAhead),
  });
  return res.data;
}

// ── Portfolios ────────────────────────────────────────────────────────────────

export async function fetchPortfolios(): Promise<PortfolioSummary[]> {
  const res = await get<{ data: PortfolioSummary[] }>("/portfolios");
  return res.data;
}

export async function createPortfolio(name: string): Promise<PortfolioSummary> {
  const res = await post<{ data: PortfolioSummary }>("/portfolios", { name });
  return res.data;
}

export async function fetchPortfolioDetail(id: number): Promise<PortfolioDetail> {
  const res = await get<{ data: PortfolioDetail }>(`/portfolios/${id}`);
  return res.data;
}

export async function addToPortfolio(
  portfolioId: number,
  ticker: string,
  quantity: number,
  purchasePrice?: number,
): Promise<void> {
  await post(`/portfolios/${portfolioId}/instruments`, { ticker, quantity, purchasePrice });
}

export async function removeFromPortfolio(portfolioId: number, ticker: string): Promise<void> {
  await del(`/portfolios/${portfolioId}/instruments/${ticker}`);
}

export async function fetchPortfolioCalendar(
  portfolioId: number,
  daysAhead = 730,
): Promise<CalendarMonth[]> {
  const res = await get<{ data: CalendarMonth[] }>(`/portfolios/${portfolioId}/calendar`, {
    days: String(daysAhead),
  });
  return res.data;
}

export { ApiError };
