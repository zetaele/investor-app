import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Currency } from '@investor-app/shared'

const STORAGE_KEY = 'investor-app-currency'

function getStoredCurrency(): Currency {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'ARS' || stored === 'USD' ? stored : 'USD'
}

/**
 * Manages the user's preferred display currency (ARS or USD).
 * Persists the preference to localStorage.
 */
export const useCurrencyStore = defineStore('currency', () => {
  const currency = ref<Currency>(getStoredCurrency())

  function setCurrency(next: Currency): void {
    currency.value = next
    localStorage.setItem(STORAGE_KEY, next)
  }

  function toggle(): void {
    setCurrency(currency.value === 'USD' ? 'ARS' : 'USD')
  }

  return { currency, setCurrency, toggle }
})
