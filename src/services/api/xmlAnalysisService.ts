import axios from 'axios';
import apiClient from '../api';
import type {
  DiagnoseValidationErrorFailure,
  DiagnoseValidationErrorRequest,
  DiagnoseValidationErrorResponse,
  DiagnoseValidationErrorStatus,
} from '../../types/transformation';

const KNOWN_ERROR_STATUSES: DiagnoseValidationErrorStatus[] = [400, 503, 504, 500];

const FRIENDLY_MESSAGE_BY_STATUS: Record<DiagnoseValidationErrorStatus, string> = {
  400: 'Mensagem de erro vazia — não é possível diagnosticar sem o erro de validação.',
  503: 'O serviço de IA (Ollama) está indisponível no momento.',
  504: 'O modelo de IA demorou demais para responder (timeout).',
  500: 'Erro interno ao tentar gerar o diagnóstico.',
};

/**
 * Erro tipado por status HTTP conhecido (400/503/504/500) para diagnóstico via IA. Lançado no
 * lugar de `Error` genérico para o componente poder diferenciar o tratamento por status sem
 * fazer parsing de mensagem.
 */
export class DiagnoseValidationErrorException
  extends Error
  implements DiagnoseValidationErrorFailure
{
  status: DiagnoseValidationErrorStatus;

  constructor(status: DiagnoseValidationErrorStatus, message: string) {
    super(message);
    this.name = 'DiagnoseValidationErrorException';
    this.status = status;
  }
}

/**
 * Serviço para diagnóstico de erro de validação via IA (Ollama local).
 *
 * Rota confirmada por handoff @lp-architect (Aria) em 2026-07-29 (implementada por
 * @lp-parser-llm/Lia): POST /api/xml-analysis/diagnose-validation-error.
 *
 * ⚠️ Endpoint POTENCIALMENTE LENTO: o caminho feliz (200) só foi validado isoladamente contra
 * Ollama real (não end-to-end), com ~150s de latência em ambiente CPU-only sem GPU. Chamadores
 * devem tratar isso como uma operação longa (loading explícito, sem timeout curto de UI) — o
 * `apiClient` já usa timeout de 120s por padrão para todas as chamadas, o que pode não ser
 * suficiente aqui; não reduzir esse timeout para esta chamada específica.
 */
export const xmlAnalysisService = {
  async diagnoseValidationError(
    request: DiagnoseValidationErrorRequest
  ): Promise<DiagnoseValidationErrorResponse> {
    try {
      const response = await apiClient.post<DiagnoseValidationErrorResponse>(
        '/api/xml-analysis/diagnose-validation-error',
        request
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status && KNOWN_ERROR_STATUSES.includes(status as DiagnoseValidationErrorStatus)) {
          const knownStatus = status as DiagnoseValidationErrorStatus;
          const backendMessage = error.response?.data?.error || error.response?.data?.message;
          throw new DiagnoseValidationErrorException(
            knownStatus,
            backendMessage || FRIENDLY_MESSAGE_BY_STATUS[knownStatus]
          );
        }
        throw new Error(
          error.response?.data?.error || error.message || 'Erro ao diagnosticar erro de validação'
        );
      }
      throw error;
    }
  },
};
