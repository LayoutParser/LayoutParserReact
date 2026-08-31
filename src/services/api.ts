import axios from 'axios';
import type {
  AutoParseRequest,
  AutoParseResponse,
  ApiConfig,
  ParseErrorInfo,
  ParseErrorKind,
  ParseFailureCause,
  ParseRequest,
  ParseResponse,
} from '../types/api';
import { SESSION_EXPIRED_EVENT } from '../types/session';
import { createCorrelationId } from '../utils/correlation';
import { isParseFailureCause } from '../utils/parseFailure';
import { normalizeParseResponse } from '../utils/parseFieldNormalization';

// Configuração da API
//
// Em produção, o caminho normal é a mesma origem do front (`/api`). O IIS encaminha esse
// prefixo ao gateway Node, que aplica autenticação/limites e então fala com a API .NET. Além de
// eliminar CORS, isso impede que IPs e portas internas sejam gravados no bundle do navegador.
// Uma URL absoluta continua aceita apenas como override explícito para diagnóstico local.
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  return envUrl || '';
};

const API_CONFIG: ApiConfig = {
  baseUrl: getApiBaseUrl(),
  endpoints: {
    parse: '/api/parse/upload',
    parseAuto: '/api/parse/auto',
    layoutDatabase: '/api/layoutdatabase',
    dataGeneration: '/api/datageneration',
    dataGenerator: '/api/datagenerator',
    learning: '/api/learning',
    xmlAnalysis: '/api/xmlanalysis',
    transformationExecution: '/api/transformationexecution',
    // A transformação multi-candidato pertence ao mesmo controller sem hífen. Contrato
    // validado em runtime contra a API local em 2026-08-05: a variante kebab-case retorna
    // 404, enquanto `/api/transformationexecution/execute-candidates` alcança o controller.
    // O diagnóstico é uma exceção deliberada: ValidationDiagnosticController declara
    // explicitamente a rota kebab-case `api/xml-analysis`.
    // Nota: `API_CONFIG` não é exportado deste módulo (os services existentes já usam path
    // literal direto na chamada `apiClient.post(...)`, ver transformationService.ts) — as duas
    // chaves abaixo documentam a rota mesmo sem serem lidas em runtime, para não perder essa
    // fonte única de verdade quando o service for escrito.
    transformationExecutionCandidates: '/api/transformationexecution/execute-candidates',
    xmlAnalysisDiagnose: '/api/xml-analysis/diagnose-validation-error',
    testing: '/api/testing',
    metrics: '/api/metrics',
  },
};

// Instância do axios configurada
const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: 120000, // 2 minutos - necessário para buscar layouts do banco
  // Não definir Content-Type para FormData - axios faz isso automaticamente com boundary
});

// ✅ CorrelationId nasce no front-end e é enviado em TODAS as chamadas
apiClient.interceptors.request.use(config => {
  // `config.headers` é obrigatório em InternalAxiosRequestConfig (axios 1.x) e aceita acesso
  // indexado pelo index signature de RawAxiosHeaders — não precisa do cast que havia aqui.
  if (!config.headers['X-Correlation-ID']) {
    config.headers['X-Correlation-ID'] = createCorrelationId();
  }

  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.url !== '/api/session' &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

/**
 * Erro tipado de POST /api/parse/upload.
 *
 * Antes, o catch abaixo achatava QUALQUER falha em `new Error(string)`. Com isso o
 * `detectedType` que a API manda no corpo do 422 morria no caminho, e um 422 (semântico:
 * "não consegui parsear este documento com este layout") ficava indistinguível de um 500 ou
 * de uma queda de rede — os três viravam a mesma `Error` com um texto. Esta classe carrega a
 * estrutura para que a UI apresente cada caso de um jeito.
 *
 * Continua sendo uma `Error` de verdade, então quem só faz `error instanceof Error` (ex.: os
 * catches genéricos que já existem na página) continua funcionando sem alteração.
 */
export class ParseRequestError extends Error implements ParseErrorInfo {
  readonly kind: ParseErrorKind;
  readonly httpStatus?: number;
  readonly detectedType?: string;
  readonly correlationId?: string;
  readonly failureCause?: ParseFailureCause;

  constructor(info: ParseErrorInfo) {
    super(info.message);
    this.name = 'ParseRequestError';
    this.kind = info.kind;
    this.httpStatus = info.httpStatus;
    this.detectedType = info.detectedType;
    this.correlationId = info.correlationId;
    this.failureCause = info.failureCause;
  }

  /** Cópia serializável (sem o rastro de `Error`) para guardar no store. */
  toInfo(): ParseErrorInfo {
    return {
      kind: this.kind,
      message: this.message,
      httpStatus: this.httpStatus,
      detectedType: this.detectedType,
      correlationId: this.correlationId,
      failureCause: this.failureCause,
    };
  }
}

export interface ParseRequestOptions {
  signal?: AbortSignal;
  onUploadProgress?: (percentage: number) => void;
}

/** Campos que o back-end manda no corpo do 422/500 (ParseController). */
interface ParseErrorBody {
  success?: boolean;
  detectedType?: string;
  message?: string;
  failureCause?: ParseFailureCause;
}

/**
 * Lê o corpo do erro defensivamente: o 422 chega como objeto JSON, mas respostas de erro mais
 * antigas (e alguns 5xx) chegam como string pura — nesse caso `data.message` seria `undefined`.
 */
const readErrorBody = (data: unknown): ParseErrorBody => {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed ? { message: trimmed } : {};
  }

  if (typeof data === 'object' && data !== null) {
    const body = data as ParseErrorBody;

    // `failureCause` é validado contra o conjunto fechado da spec: um valor desconhecido
    // (contrato mudou / typo do back-end) vira `undefined` para a UI cair no fallback por
    // status HTTP, em vez de sumir com o banner por causa de um `Record` sem a chave.
    const rawCause: unknown = body.failureCause;
    const failureCause = isParseFailureCause(rawCause) ? rawCause : undefined;
    return {
      detectedType: typeof body.detectedType === 'string' ? body.detectedType : undefined,
      message: typeof body.message === 'string' && body.message.trim() ? body.message : undefined,
      failureCause,
    };
  }

  return {};
};

const convertParseRequestError = (error: unknown, parseErrorMessage: string): unknown => {
  if (!axios.isAxiosError(error)) return error;

  const response = error.response;
  const body = readErrorBody(response?.data);
  // Axios normaliza os headers de resposta em minúsculas.
  const rawCorrelationId = response?.headers?.['x-correlation-id'];
  const correlationId =
    typeof rawCorrelationId === 'string' && rawCorrelationId ? rawCorrelationId : undefined;

  // Sem `response`: nunca houve resposta HTTP (rede/timeout/CORS).
  if (!response) {
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return new ParseRequestError({
      kind: 'network_error',
      message: isTimeout
        ? 'A requisição excedeu o tempo limite. O documento pode ser grande demais ou a API pode estar sobrecarregada.'
        : 'Não foi possível se comunicar com a API. Verifique sua conexão e se o serviço está no ar.',
      correlationId,
    });
  }

  if (response.status === 422) {
    return new ParseRequestError({
      kind: 'parse_error',
      message: body.message || parseErrorMessage,
      httpStatus: response.status,
      detectedType: body.detectedType,
      correlationId,
      failureCause: body.failureCause,
    });
  }

  const isServerFault = response.status >= 500;
  return new ParseRequestError({
    kind: 'server_error',
    message: isServerFault
      ? 'O servidor encontrou uma falha ao processar o documento.'
      : body.message || `A API recusou a requisição (HTTP ${response.status}).`,
    httpStatus: response.status,
    detectedType: body.detectedType,
    correlationId,
    failureCause: body.failureCause,
  });
};

// Serviço de parsing
export const parseService = {
  /**
   * Envia arquivos para parsing na API
   */
  async parseFiles(
    request: ParseRequest,
    options: ParseRequestOptions = {}
  ): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append('layoutFile', request.layoutFile);
    formData.append('txtFile', request.txtFile);

    if (request.layoutName) {
      formData.append('layoutName', request.layoutName);
    }

    if (request.layoutType) {
      formData.append('layoutType', request.layoutType);
    }

    if (request.layoutConfig) {
      formData.append('layoutConfig', JSON.stringify(request.layoutConfig));
    }

    try {
      const response = await apiClient.post<ParseResponse>(API_CONFIG.endpoints.parse, formData, {
        signal: options.signal,
        onUploadProgress: progress => {
          if (!options.onUploadProgress || !progress.total) return;
          const percentage = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
          options.onUploadProgress(percentage);
        },
      });

      return normalizeParseResponse(response.data);
    } catch (error) {
      throw convertParseRequestError(
        error,
        'Não foi possível parsear o documento com o layout informado.'
      );
    }
  },

  /**
   * Envia somente o documento para a detecção autoritativa. Quando o usuário escolhe um
   * candidato ambíguo, o GUID volta como override explícito; o front não altera o ranking.
   */
  async parseAutomatically(
    request: AutoParseRequest,
    options: ParseRequestOptions = {}
  ): Promise<AutoParseResponse> {
    const formData = new FormData();
    formData.append('documentFile', request.documentFile);
    if (request.layoutGuidOverride) {
      formData.append('layoutGuidOverride', request.layoutGuidOverride);
    }

    try {
      const response = await apiClient.post<AutoParseResponse>(
        API_CONFIG.endpoints.parseAuto,
        formData,
        {
          signal: options.signal,
          onUploadProgress: progress => {
            if (!options.onUploadProgress || !progress.total) return;
            const percentage = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
            options.onUploadProgress(percentage);
          },
        }
      );
      const rawHeader = response.headers['x-correlation-id'];
      const correlationId =
        response.data.correlationId || (typeof rawHeader === 'string' ? rawHeader : '');

      return {
        ...response.data,
        correlationId,
        ...(response.data.parseResult
          ? {
              parseResult: normalizeParseResponse({
                ...response.data.parseResult,
                correlationId:
                  response.data.parseResult.correlationId || correlationId || undefined,
              }),
            }
          : {}),
      };
    } catch (error) {
      throw convertParseRequestError(
        error,
        'Não foi possível identificar um layout para este documento.'
      );
    }
  },
};

export default apiClient;
export { apiClient };
