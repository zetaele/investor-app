import { env } from '../../config/env.js'
import type { BymaMarketPrice, IBYMAClient } from './byma.types.js'
import { BymaClientError, BymaInstrumentNotFoundError } from './byma.types.js'

/**
 * Official BYMA API client.
 *
 * Implements IBYMAClient using BYMA Data's authenticated REST API.
 * Requires BYMA_API_BASE_URL and BYMA_API_KEY to be set in the environment.
 *
 * TODO: Fill in the actual endpoint paths and response mapping once
 * BYMA Data credentials and API documentation are available.
 *
 * @see https://data.byma.com.ar
 */
export class BymaOfficialClient implements IBYMAClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor() {
    this.baseUrl = env.BYMA_API_BASE_URL
    this.apiKey = env.BYMA_API_KEY
  }

  private get defaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // TODO: confirm the correct auth header name with BYMA documentation
      'Authorization': `Bearer ${this.apiKey}`,
    }
  }

  /**
   * TODO: Map the actual BYMA API response shape to BymaMarketPrice.
   * The response structure below is a placeholder — update once docs are available.
   */
  private mapResponseToPrice(ticker: string, raw: unknown): BymaMarketPrice {
    // TODO: replace with actual field mapping from BYMA API response
    const data = raw as Record<string, unknown>

    return {
      ticker,
      price: Number(data['price'] ?? data['lastPrice'] ?? data['settlementPrice'] ?? 0),
      volume: data['volume'] !== undefined ? Number(data['volume']) : null,
      updatedAt: String(data['updatedAt'] ?? data['timestamp'] ?? new Date().toISOString()),
    }
  }

  async getPrice(ticker: string): Promise<BymaMarketPrice> {
    // TODO: replace with the correct BYMA endpoint path for single instrument price
    const url = `${this.baseUrl}/market/prices/${ticker}`

    let response: Response

    try {
      response = await fetch(url, { headers: this.defaultHeaders })
    } catch (err) {
      throw new BymaClientError(`Failed to reach BYMA API for ticker ${ticker}`, err)
    }

    if (response.status === 404) {
      throw new BymaInstrumentNotFoundError(ticker)
    }

    if (!response.ok) {
      throw new BymaClientError(
        `BYMA API returned ${response.status} for ticker ${ticker}`,
      )
    }

    const raw: unknown = await response.json()
    return this.mapResponseToPrice(ticker, raw)
  }

  async getPrices(tickers: string[]): Promise<Map<string, BymaMarketPrice>> {
    // TODO: check if BYMA API supports bulk price requests.
    // If not, replace with Promise.allSettled over individual getPrice calls.
    const url = `${this.baseUrl}/market/prices/bulk`

    let response: Response

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({ tickers }),
      })
    } catch (err) {
      throw new BymaClientError('Failed to reach BYMA API for bulk price request', err)
    }

    if (!response.ok) {
      throw new BymaClientError(`BYMA API bulk request returned ${response.status}`)
    }

    const raw: unknown = await response.json()
    const items = Array.isArray(raw) ? raw : []

    const result = new Map<string, BymaMarketPrice>()

    for (const item of items) {
      const data = item as Record<string, unknown>
      const ticker = String(data['ticker'] ?? '')
      if (ticker.length > 0) {
        result.set(ticker, this.mapResponseToPrice(ticker, data))
      }
    }

    return result
  }
}
