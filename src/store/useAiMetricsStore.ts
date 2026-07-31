import { create } from 'zustand';
import { aiMetricsService } from '../services/api/aiMetricsService';
import type { AiGeneration, AiGenerationsFilters, AiMetricsSummary } from '../types/aiMetrics';

// Estado do domínio "métricas de IA" (Gap 3). Contrato antecipado — o back-end ainda não
// implementou os endpoints, então `summaryError`/`generationsError` populados é o estado
// ESPERADO por enquanto (não indica bug do front). Ver aiMetricsService.ts.
interface AiMetricsState {
  // Resumo agregado (GET /api/ai-metrics/summary)
  summary: AiMetricsSummary | null;
  isLoadingSummary: boolean;
  summaryError: string | null;

  // Lista paginada de gerações (GET /api/ai-metrics/generations)
  generations: AiGeneration[];
  totalCount: number;
  isLoadingGenerations: boolean;
  generationsError: string | null;

  // Filtros ativos da lista de gerações
  filters: AiGenerationsFilters;

  fetchSummary: (filters?: { de?: string; ate?: string }) => Promise<void>;
  fetchGenerations: (filters?: AiGenerationsFilters) => Promise<void>;
  setFilters: (filters: AiGenerationsFilters) => void;
  reset: () => void;
}

const initialFilters: AiGenerationsFilters = {
  page: 1,
  pageSize: 20,
};

const initialState = {
  summary: null,
  isLoadingSummary: false,
  summaryError: null,

  generations: [] as AiGeneration[],
  totalCount: 0,
  isLoadingGenerations: false,
  generationsError: null,

  filters: initialFilters,
};

export const useAiMetricsStore = create<AiMetricsState>((set, get) => ({
  ...initialState,

  fetchSummary: async filters => {
    set({ isLoadingSummary: true, summaryError: null });
    try {
      const summary = await aiMetricsService.getSummary(filters);
      set({ summary, isLoadingSummary: false });
    } catch (error) {
      set({
        summaryError:
          error instanceof Error ? error.message : 'Erro ao buscar resumo de métricas de IA',
        isLoadingSummary: false,
      });
    }
  },

  fetchGenerations: async filters => {
    const mergedFilters = { ...get().filters, ...filters };
    set({ isLoadingGenerations: true, generationsError: null, filters: mergedFilters });
    try {
      const response = await aiMetricsService.getGenerations(mergedFilters);
      set({
        generations: response.items,
        totalCount: response.totalCount,
        isLoadingGenerations: false,
      });
    } catch (error) {
      set({
        generationsError: error instanceof Error ? error.message : 'Erro ao buscar gerações de IA',
        isLoadingGenerations: false,
      });
    }
  },

  setFilters: filters => set({ filters: { ...get().filters, ...filters } }),

  reset: () => set(initialState),
}));
