import type { Currency } from "@investor-app/shared";

/**
 * Formats a decimal yield as a percentage string.
 * e.g. 0.2958909 → "29.59%"
 */
export function formatYield(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a price with the appropriate currency symbol and thousands separator.
 * e.g. formatPrice(62.50, 'USD')      → "USD 62,50"
 *      formatPrice(136700, 'ARS')     → "ARS 136.700,00"
 */
export function formatPrice(value: number, currency: Currency, decimals = 2): string {
  const symbol = currency === "ARS" ? "ARS" : "USD";
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${symbol} ${formatted}`;
}

/**
 * Formats a number with a fixed number of decimal places.
 * e.g. formatNumber(1.3632, 2) → "1.36"
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Formats an ISO date string as a human-readable date.
 * e.g. "2030-07-09" → "09 Jul 2030"
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Returns the number of days from today to a future date.
 * e.g. daysUntil("2030-07-09") → 1570
 */
export function daysUntil(isoDate: string): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((target - now) / MS_PER_DAY));
}

/**
 * Returns a human-readable time-to-maturity string.
 * e.g. daysUntil("2027-01-09") → "2a 9m"
 */
export function formatTimeToMaturity(isoDate: string): string {
  const days = daysUntil(isoDate);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);

  if (years === 0 && months === 0) return `${days}d`;
  if (years === 0) return `${months}m`;
  if (months === 0) return `${years}a`;
  return `${years}a ${months}m`;
}

/**
 * Returns the CSS class for a numeric value (positive/negative/neutral).
 */
export function valueClass(value: number): string {
  if (value > 0) return "num-positive";
  if (value < 0) return "num-negative";
  return "num-neutral";
}
