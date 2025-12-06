import apiClient from '../api';
import type { LineValidationInfo } from '../../types/api';

export interface LayoutAnalysis {
  layoutGuid: string;
  name: string;
  description?: string;
  layoutType?: string;
  status: 'valid' | 'invalid' | 'not_configured' | 'error';
  expectedLineLength?: number;
  totalLines: number;
  validLines: number;
  invalidLines: number;
  linesWithChildren: number;
  lineValidations: Array<{
    lineName: string;
    initialValue: string;
    initialValueLength: number;
    sequenceFromPreviousLine: number;
    fieldsLength: number;
    sequenciaLength: number;
    totalLength: number;
    isValid: boolean;
    hasChildren: boolean;
    fieldCount: number;
    calculatedPositions: Record<string, number>;
  }>;
  error?: string;
}

export interface MonitoringResponse {
  success: boolean;
  timestamp: string;
  summary: {
    totalLayouts: number;
    validLayouts: number;
    invalidLayouts: number;
    layoutsWithErrors: number;
    validationRate: number;
  };
  layouts: LayoutAnalysis[];
}

export const monitoringService = {
  /**
   * Busca análise completa de todos os layouts
   */
  async getLayoutsAnalysis(): Promise<MonitoringResponse> {
    try {
      const response = await apiClient.get<MonitoringResponse>('/api/monitoring/layouts-analysis');
      return response.data;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao buscar análise de layouts:', error);
      }
      throw error;
    }
  },
};

