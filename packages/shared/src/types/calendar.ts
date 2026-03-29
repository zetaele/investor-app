import type { Currency } from "./instrument.js";

export interface CalendarPayment {
  paymentDate: string;
  ticker: string;
  instrumentName: string;
  instrumentType: "BOND" | "LETTER" | "ON";
  currency: Currency;
  coupon: number;
  amortization: number;
  totalFlow: number;
  /** For portfolio calendar: totalFlow × quantity / 100. */
  totalFlowScaled?: number;
  residualAfter: number;
}

export interface CalendarMonth {
  month: string;
  label: string;
  payments: CalendarPayment[];
}
