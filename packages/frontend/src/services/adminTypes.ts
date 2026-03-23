export interface GeneratedCashflow {
  paymentDate:  string
  coupon:       number
  amortization: number
  residual:     number
}

export interface AdminInstrument {
  id:           number
  ticker:       string
  name:         string
  type:         'BOND' | 'LETTER' | 'ON'
  flowType:     string
  currency:     string
  market:       string
  issuer:       string | null
  maturityDate: string
  isActive:     boolean
}

export type FlowType =
  | 'BULLET'
  | 'AMORTIZABLE'
  | 'ZERO_COUPON'
  | 'CAPITALIZABLE'
  | 'CER'
  | 'USD_LINKED'

export const FLOW_TYPE_LABELS: Record<FlowType, string> = {
  BULLET:        'Bullet',
  AMORTIZABLE:   'Amortizable',
  ZERO_COUPON:   'Cero cupón',
  CAPITALIZABLE: 'Capitalizable (LECAP/BONCAP)',
  CER:           'CER',
  USD_LINKED:    'Dólar-linked',
}

export const FLOW_TYPE_DESCRIPTIONS: Record<FlowType, string> = {
  BULLET:        'Cupones periódicos + 100% capital al vencimiento',
  AMORTIZABLE:   'Cupones sobre capital residual + amortizaciones parciales',
  ZERO_COUPON:   'Sin cupones, emitido a descuento, rescatado a valor nominal',
  CAPITALIZABLE: 'Capital crece por TNA, un único pago al vencimiento',
  CER:           'Flujos ajustados por coeficiente CER (inflación)',
  USD_LINKED:    'Flujos en ARS indexados al tipo de cambio oficial',
}
