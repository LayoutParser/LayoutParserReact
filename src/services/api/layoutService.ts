import axios from 'axios';
import apiClient from '../api';
import type { LayoutSearchResponse } from '../../types/layout';

/**
 * Serviço para buscar layouts do banco de dados
 */
export const layoutService = {
  /**
   * Busca layouts do banco de dados (MQSeries NFe)
   * Retorna layouts que podem estar no Redis ou no banco
   */
  async searchLayouts(): Promise<LayoutSearchResponse> {
    try {
      const response = await apiClient.get<LayoutSearchResponse>(
        '/api/layoutdatabase/mqseries-nfe'
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || 
          error.message || 
          'Erro ao buscar layouts'
        );
      }
      throw error;
    }
  },

  /**
   * Verifica se há layouts no Redis
   * Layouts no Redis têm decryptedContent preenchido
   */
  hasLayoutsInRedis(layouts: any[]): boolean {
    if (!layouts || layouts.length === 0) {
      return false;
    }
    
    return layouts.some(layout => 
      layout.decryptedContent && layout.decryptedContent.length > 0
    );
  },

  /**
   * Atualiza o cache Redis no backend
   */
  async refreshCache(): Promise<{ success: boolean; message?: string; error?: string; timestamp?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message?: string; error?: string; timestamp?: string }>(
        '/api/layoutdatabase/refresh-cache'
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message || 'Erro ao atualizar cache';
        throw new Error(errorMessage);
      }
      throw error;
    }
  },
};

