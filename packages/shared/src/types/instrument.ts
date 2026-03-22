/** Supported instrument types in the Argentine market. */
export type InstrumentType = 'BOND' | 'LETTER' | 'ON'

/** Currencies in which instruments can be denominated. */
export type Currency = 'ARS' | 'USD' | 'USD_LINKED'

/** Core instrument data — static, not price-sensitive. */
export interface Instrument {
  id: number
  ticker: string
  name: string
  type: InstrumentType
  currency: Currency
  market: string
  issuer: string | null
  maturityDate: string // ISO 8601
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** A single cash flow event (coupon + amortization on a given date). */
export interface Cashflow {
  id: number
  instrumentId: number
  paymentDate: string // ISO 8601
  coupon: number
  amortization: number
  /** Remaining capital percentage after this payment (0–1). */
  residual: number
}
