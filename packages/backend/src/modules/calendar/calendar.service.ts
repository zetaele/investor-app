import { and, eq, gt } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { cashflows, instruments } from '../../db/schema.js'

export interface CalendarPayment {
  paymentDate: string
  ticker: string
  instrumentName: string
  instrumentType: 'BOND' | 'LETTER' | 'ON'
  currency: 'ARS' | 'USD' | 'USD_LINKED'
  coupon: number
  amortization: number
  totalFlow: number
  residualAfter: number
}

export interface CalendarMonth {
  /** e.g. "2026-07" */
  month: string
  /** e.g. "Julio 2026" */
  label: string
  payments: CalendarPayment[]
}

/**
 * Returns all upcoming cash flow payments across all active instruments,
 * grouped by calendar month and ordered by payment date ascending.
 *
 * @param daysAhead - How many days into the future to look (default: 730 = ~2 years)
 */
export async function getUpcomingPayments(daysAhead = 730): Promise<CalendarMonth[]> {
  const today = new Date()
  const horizon = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const todayISO = today.toISOString().split('T')[0] ?? ''
  const horizonISO = horizon.toISOString().split('T')[0] ?? ''

  // Join cashflows with instruments to get all metadata in one query
  const rows = await db
    .select({
      paymentDate:    cashflows.paymentDate,
      coupon:         cashflows.coupon,
      amortization:   cashflows.amortization,
      residual:       cashflows.residual,
      ticker:         instruments.ticker,
      instrumentName: instruments.name,
      instrumentType: instruments.type,
      currency:       instruments.currency,
    })
    .from(cashflows)
    .innerJoin(instruments, eq(cashflows.instrumentId, instruments.id))
    .where(
      and(
        eq(instruments.isActive, true),
        gt(cashflows.paymentDate, todayISO),
      ),
    )
    .orderBy(cashflows.paymentDate)

  // Filter by horizon and only include rows with actual flows
  const filtered = rows.filter(
    (r) =>
      r.paymentDate <= horizonISO &&
      (r.coupon > 0 || r.amortization > 0),
  )

  // Group by month
  const monthMap = new Map<string, CalendarPayment[]>()

  for (const row of filtered) {
    const month = row.paymentDate.slice(0, 7) // "YYYY-MM"
    if (month === undefined || month === '') continue

    if (!monthMap.has(month)) {
      monthMap.set(month, [])
    }

    monthMap.get(month)!.push({
      paymentDate:    row.paymentDate,
      ticker:         row.ticker,
      instrumentName: row.instrumentName,
      instrumentType: row.instrumentType as 'BOND' | 'LETTER' | 'ON',
      currency:       row.currency as 'ARS' | 'USD' | 'USD_LINKED',
      coupon:         row.coupon,
      amortization:   row.amortization,
      totalFlow:      row.coupon + row.amortization,
      residualAfter:  row.residual,
    })
  }

  // Build sorted month array with human-readable labels
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, payments]) => ({
      month,
      label: formatMonthLabel(month),
      payments,
    }))
}

/**
 * Formats a "YYYY-MM" string into a human-readable Spanish label.
 * e.g. "2026-07" → "Julio 2026"
 */
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-')
  if (year === undefined || monthNum === undefined) return month

  const date = new Date(Number(year), Number(monthNum) - 1, 1)
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}
