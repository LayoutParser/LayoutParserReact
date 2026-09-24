import axios from 'axios';
import type {
  GenerateSampleDocumentErrorInfo,
  GenerateSampleDocumentErrorKind,
  GenerateSampleDocumentRequest,
  GenerateSampleDocumentResponse,
} from '../../types/sampleDocument';
import apiClient from '../api';

/**
 * Erro tipado de "gerar documento de exemplo" (mesmo padrão de `ParseRequestError` em
 * `services/api.ts`): carrega a causa classificada (issue #239) em vez de achatar tudo em
 * `new Error(string)`.
 */
export class GenerateSampleDocumentError extends Error implements GenerateSampleDocumentErrorInfo {
  readonly kind: GenerateSampleDocumentErrorKind;
  readonly httpStatus?: number;

  constructor(info: GenerateSampleDocumentErrorInfo) {
    super(info.message);
    this.name = 'GenerateSampleDocumentError';
    this.kind = info.kind;
    this.httpStatus = info.httpStatus;
  }
}

/**
 * Converte a falha do axios no `GenerateSampleDocumentError` já consumido pela UI (issue #239):
 * 400 = layoutGuid desconhecido; 404 = layout sem mapper TCL/XSL/XSLT vinculado; os demais
 * status/falha de transporte caem em `server_error`/`network_error`, no mesmo padrão de
 * `convertParseRequestError` em `services/api.ts`.
 */
const convertGenerateSampleDocumentError = (error: unknown): GenerateSampleDocumentError => {
  if (!axios.isAxiosError(error)) {
    return new GenerateSampleDocumentError({
      kind: 'server_error',
      message: 'Não foi possível gerar o documento de exemplo. Tente novamente.',
    });
  }

  const response = error.response;

  if (!response) {
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return new GenerateSampleDocumentError({
      kind: 'network_error',
      message: isTimeout
        ? 'A requisição excedeu o tempo limite. Tente novamente em instantes.'
        : 'Não foi possível se comunicar com a API. Verifique sua conexão e se o serviço está no ar.',
    });
  }

  if (response.status === 400) {
    return new GenerateSampleDocumentError({
      kind: 'unknown_layout',
      message:
        'Layout desconhecido. Selecione um layout válido do catálogo antes de gerar o exemplo.',
      httpStatus: 400,
    });
  }

  if (response.status === 404) {
    return new GenerateSampleDocumentError({
      kind: 'no_mapper',
      message: 'Este layout ainda não tem um mapeador TCL/XSL/XSLT — gere um mapeamento primeiro.',
      httpStatus: 404,
    });
  }

  return new GenerateSampleDocumentError({
    kind: 'server_error',
    message: 'O servidor encontrou uma falha ao gerar o documento de exemplo.',
    httpStatus: response.status,
  });
};

export const sampleDocumentService = {
  /**
   * Gera um documento de exemplo a partir do layout já cadastrado no catálogo, chamando
   * POST /api/layouts/{layoutGuid}/generate-sample (LayoutParserApi#355/#356 — em produção
   * desde 2026-09-10, cobrindo TextPositional e Xml).
   */
  async generateSampleDocument(
    layoutGuid: string,
    request: GenerateSampleDocumentRequest = {}
  ): Promise<GenerateSampleDocumentResponse> {
    if (!layoutGuid || !layoutGuid.trim()) {
      throw new GenerateSampleDocumentError({
        kind: 'unknown_layout',
        message:
          'Layout desconhecido. Selecione um layout válido do catálogo antes de gerar o exemplo.',
        httpStatus: 400,
      });
    }

    try {
      const response = await apiClient.post<GenerateSampleDocumentResponse>(
        `/api/layouts/${encodeURIComponent(layoutGuid)}/generate-sample`,
        request
      );
      return response.data;
    } catch (error) {
      throw convertGenerateSampleDocumentError(error);
    }
  },
};
