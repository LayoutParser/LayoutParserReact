import axios from 'axios';
import apiClient from '../api';
import type {
  MapperAvailability,
  MapperInfo,
  TransformationExecutionRequest,
  TransformationExecutionResponse,
} from '../../types/transformation';

/**
 * Serviço para o fluxo "XML Transformação Final": checa se um layout tem transformação
 * disponível (via Mapper cadastrado) e executa a transformação (validação + geração de XML).
 *
 * Rotas validadas em 2026-07-20 contra a API real (ambiente 172.25.32.42:5000):
 * - GET  /api/mapperdatabase/by-input/{layoutGuid} -> 200 com o mapper | 404 se não existe
 * - POST /api/transformationexecution/execute      -> ver types/transformation.ts
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
   * Executa a transformação (validação do input + geração do XML final) no back-end.
   *
   * Erros de NEGÓCIO (o back-end responde 400 com `{ success: false, errors, warnings }`
   * quando não consegue transformar, ex.: mapeador sem arquivo gerado) são retornados
   * normalmente como `TransformationExecutionResponse` — não lançam exception — para o
   * componente tratar `result.success` sem precisar de try/catch para esse caso.
   * Falhas de infraestrutura (rede, 5xx sem esse shape) lançam Error, como no resto do app.
   */
  async executeTransformation(
    request: TransformationExecutionRequest
  ): Promise<TransformationExecutionResponse> {
    try {
      const response = await apiClient.post<TransformationExecutionResponse>(
        '/api/transformationexecution/execute',
        request
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === 'object' && data.success === false) {
          return data as TransformationExecutionResponse;
        }
        throw new Error(data?.error || error.message || 'Erro ao executar transformação XML');
      }
      throw error;
    }
  },
};
