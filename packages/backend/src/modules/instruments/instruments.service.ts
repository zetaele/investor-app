import type { Cashflow, Instrument } from '@investor-app/shared'
import {
  findAllInstruments,
  findCashflowsByInstrumentId,
  findInstrumentByTicker,
} from './instruments.repository.js'

export class InstrumentNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Instrument not found: ${ticker}`)
    this.name = 'InstrumentNotFoundError'
  }
}

/**
 * Returns all active instruments.
 * Accepts optional filters for type and currency.
 */
export async function listInstruments(filters?: {
  type?: Instrument['type']
  currency?: Instrument['currency']
}): Promise<Instrument[]> {
  return findAllInstruments(filters)
}

/**
 * Returns a single instrument by ticker.
 * Throws InstrumentNotFoundError if the ticker does not exist or is inactive.
 */
export async function getInstrument(ticker: string): Promise<Instrument> {
  const instrument = await findInstrumentByTicker(ticker)

  if (instrument === undefined) {
    throw new InstrumentNotFoundError(ticker)
  }

  return instrument
}

/**
 * Returns all scheduled cash flows for a given ticker.
 * Throws InstrumentNotFoundError if the ticker does not exist.
 */
export async function getInstrumentCashflows(ticker: string): Promise<Cashflow[]> {
  const instrument = await getInstrument(ticker)
  return findCashflowsByInstrumentId(instrument.id)
}
