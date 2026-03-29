import { defineStore } from "pinia";
import { ref } from "vue";
import type { PortfolioSummary, PortfolioDetail, CalendarMonth } from "@investor-app/shared";
import {
  fetchPortfolios,
  createPortfolio,
  fetchPortfolioDetail,
  addToPortfolio,
  removeFromPortfolio,
  fetchPortfolioCalendar,
} from "@/services/api";

export const usePortfolioStore = defineStore("portfolio", () => {
  const portfolios = ref<PortfolioSummary[]>([]);
  const current = ref<PortfolioDetail | null>(null);
  const calendar = ref<CalendarMonth[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadPortfolios(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      portfolios.value = await fetchPortfolios();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Error cargando portafolios";
    } finally {
      loading.value = false;
    }
  }

  async function create(name: string): Promise<PortfolioSummary> {
    const p = await createPortfolio(name);
    portfolios.value.push(p);
    return p;
  }

  async function loadDetail(id: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      current.value = await fetchPortfolioDetail(id);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Error cargando portafolio";
    } finally {
      loading.value = false;
    }
  }

  async function addInstrument(
    portfolioId: number,
    ticker: string,
    quantity: number,
    purchasePrice?: number,
  ): Promise<void> {
    await addToPortfolio(portfolioId, ticker, quantity, purchasePrice);
    await loadDetail(portfolioId);
  }

  async function removeInstrument(portfolioId: number, ticker: string): Promise<void> {
    await removeFromPortfolio(portfolioId, ticker);
    if (current.value) {
      current.value.holdings = current.value.holdings.filter((h) => h.ticker !== ticker);
    }
  }

  async function loadCalendar(portfolioId: number): Promise<void> {
    calendar.value = await fetchPortfolioCalendar(portfolioId);
  }

  return {
    portfolios,
    current,
    calendar,
    loading,
    error,
    loadPortfolios,
    create,
    loadDetail,
    addInstrument,
    removeInstrument,
    loadCalendar,
  };
});
