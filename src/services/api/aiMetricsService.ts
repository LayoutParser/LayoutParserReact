import axios from 'axios';
import apiClient from '../api';
import type {
  AiGenerationsFilters,
  AiGenerationsResponse,
  AiMetricsSummary,
  AiMetricsSummaryFilters,
} from '../../types/aiMetrics';

// Serviço de métricas de IA (Gap 3) — contrato publicado por @lp-architect (Aria) em
// 2026-07-30, AINDA NÃO implementado no back-end. Chamadas aqui devem devolver 404/erro de
// conexão até o back-end subir; isso é esperado e a store/UI já tratam como estado normal
// ("indisponível por enquanto"), não como bug do front.
export const aiMetricsService = {
  /**
   * Lista paginada de gerações de IA. GET /api/ai-metrics/generations
   */
  async getGenerations(filters: AiGenerationsFilters = {}): Promise<AiGenerationsResponse> {
    try {
      const response = await apiClient.get<AiGenerationsResponse>('/api/ai-metrics/generations', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || error.message || 'Erro ao buscar gerações de IA'
        );
      }
      throw error;
    }
  },

  /**
   * Resumo agregado de métricas de IA. GET /api/ai-metrics/summary
   */
  async getSummary(filters: AiMetricsSummaryFilters = {}): Promise<AiMetricsSummary> {
    try {
      const response = await apiClient.get<AiMetricsSummary>('/api/ai-metrics/summary', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message ||
            error.message ||
            'Erro ao buscar resumo de métricas de IA'
        );
      }
      throw error;
    }
  },
};

export default aiMetricsService;
