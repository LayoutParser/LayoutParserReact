import axios from 'axios';
import apiClient from '../api';
import type {
  MapperAvailability,
  MapperInfo,
  TransformationCandidatesRequest,
  TransformationCandidatesResponse,
} from '../../types/transformation';

/**
 * Serviço para o fluxo "XML Transformação Final": checa se um layout tem transformação
 * disponível (via Mapper cadastrado) e executa a transformação (validação + geração de XML).
 *
 * Rotas validadas em 2026-07-20 contra um ambiente de integração da API:
 * - GET  /api/mapperdatabase/by-input/{layoutGuid} -> 200 com o mapper | 404 se não existe
 * - POST /api/transformationexecution/execute-candidates -> ver types/transformation.ts
 */
export const transformationService = {
  /**
   * Verifica se existe um Mapper cadastrado para o layoutGuid informado.
   * Este é o critério de negócio para exibir o botão "XML Transformação Final"
   * (confirmado com o usuário — não é o campo `layoutType`).
   *
   * 404 é um resultado ESPERADO (mapeador não encontrado) e é tratado como
   * `{ available: false }`, não como erro. Outras falhas (rede, 5xx) são propagadas.
   */
  async checkMapperAvailability(layoutGuid: string): Promise<MapperAvailability> {
    try {
      const response = await apiClient.get<MapperInfo>(
        `/api/mapperdatabase/by-input/${layoutGuid}`
      );
      return { available: true, mapper: response.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return { available: false };
        }
        throw new Error(
          error.response?.data?.error ||
            error.message ||
            'Erro ao verificar disponibilidade de transformação XML'
        );
      }
      throw error;
    }
  },

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
};
