import axios from 'axios';
import apiClient from '../api';
import type {
  AiCandidateStatus,
  TransformationCandidatesRequest,
  TransformationCandidatesResponse,
} from '../../types/transformation';

/**
 * Serviço para o fluxo "XML Transformação Final": executa a avaliação multi-candidato e a
 * transformação (validação + geração de XML) pelos pathways Sysmiddle e TCL/XSL.
 *
 * Rotas validadas em 2026-07-20 contra um ambiente de integração da API:
 * - POST /api/transformationexecution/execute-candidates -> ver types/transformation.ts
 * - GET /api/transformationexecution/execute-candidates/{ticket}/ia-status -> polling do
 *   fallback automático de IA (issue #140), ver types/transformation.ts
 */
export const transformationService = {
  /**
   * Executa a transformação e devolve TODOS os caminhos possíveis (multi-candidato), em vez
   * de assumir um único resultado. Esta rota sempre responde 200 em sucesso — mesmo com
   * `candidates: []` (zero candidatos é estado válido, não falha), então não há um shape de
   * "falha de negócio" paralelo aqui: qualquer exceção lançada é infraestrutura (rede, 5xx)
   * e vira `Error`.
   */
  async executeTransformationCandidates(
    request: TransformationCandidatesRequest
  ): Promise<TransformationCandidatesResponse> {
    try {
      const response = await apiClient.post<TransformationCandidatesResponse>(
        '/api/transformationexecution/execute-candidates',
        request
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        throw new Error(
          data?.error || error.message || 'Erro ao executar transformação XML (multi-candidato)'
        );
      }
      throw error;
    }
  },

  /**
   * Consulta o status do job de IA em background (fallback automático quando nenhum candidato
   * síncrono foi encontrado). Ticket de outro usuário devolve 404 da própria API (nunca 403) —
   * tratamos isso como `status: 'not-found'` em vez de propagar a exceção, já que é um estado
   * terminal esperado do polling, não uma falha de infraestrutura.
   */
  async getAiCandidateStatus(ticket: string): Promise<AiCandidateStatus> {
    try {
      const response = await apiClient.get<AiCandidateStatus>(
        `/api/transformationexecution/execute-candidates/${encodeURIComponent(ticket)}/ia-status`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return { status: 'not-found', candidate: null, diagnostics: null };
        }
        const data = error.response?.data;
        throw new Error(
          data?.error || error.message || 'Erro ao consultar status do fallback de IA'
        );
      }
      throw error;
    }
  },
};
