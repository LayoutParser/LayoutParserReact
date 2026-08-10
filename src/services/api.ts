import axios from 'axios';
import type {
  ApiConfig,
  ParseErrorInfo,
  ParseErrorKind,
  ParseFailureCause,
  ParseRequest,
  ParseResponse,
} from '../types/api';
import { createCorrelationId } from '../utils/correlation';
import { isParseFailureCause } from '../utils/parseFailure';

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

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const response = error.response;
        const body = readErrorBody(response?.data);
        // Axios normaliza os headers de resposta em minúsculas.
        const rawCorrelationId = response?.headers?.['x-correlation-id'];
        const correlationId =
          typeof rawCorrelationId === 'string' && rawCorrelationId ? rawCorrelationId : undefined;

        // Sem `response`: nunca houve resposta HTTP (rede/timeout/CORS).
        if (!response) {
          const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
          throw new ParseRequestError({
            kind: 'network_error',
            message: isTimeout
              ? 'A requisição excedeu o tempo limite. O documento pode ser grande demais ou a API pode estar sobrecarregada.'
              : 'Não foi possível se comunicar com a API. Verifique sua conexão e se o serviço está no ar.',
            correlationId,
          });
        }

        // 422: o back-end parseou a requisição e concluiu que o documento não é processável
        // com o layout informado. É diagnóstico do documento, não falha da aplicação.
        //
        // O `kind` continua sendo a leitura do TRANSPORTE (status HTTP). Quem manda na
        // apresentação é o `failureCause` do corpo quando ele vem — inclusive se discordar do
        // status (ex.: `parser_defect` num 422, que seria divergência da spec §3): ver
        // `assessParseFailure`. Não reescrevemos o `kind` aqui de propósito, para o fato bruto
        // "a API respondeu 422" continuar disponível/diagnosticável.
        if (response.status === 422) {
          throw new ParseRequestError({
            kind: 'parse_error',
            message: body.message || 'Não foi possível parsear o documento com o layout informado.',
            httpStatus: response.status,
            detectedType: body.detectedType,
            correlationId,
            failureCause: body.failureCause,
          });
        }

        // 5xx (spec §2.3: `failureCause: "parser_defect"`) e demais status inesperados.
        //
        // Nota: o contrato só especifica 422 / >=500 / rede. Um 4xx que não seja 422 (ex.: o
        // BadRequest do ParseController quando falta arquivo) cai aqui também — nesse caso o
        // corpo costuma trazer uma mensagem específica e útil, que é preferida ao texto
        // genérico. O texto de fallback é escolhido pelo status para não afirmar "falha do
        // servidor" diante de um 4xx, que é problema da requisição.
        const isServerFault = response.status >= 500;
        throw new ParseRequestError({
          kind: 'server_error',
          message: isServerFault
            ? 'O servidor encontrou uma falha ao processar o documento.'
            : body.message || `A API recusou a requisição (HTTP ${response.status}).`,
          httpStatus: response.status,
          detectedType: body.detectedType,
          correlationId,
          failureCause: body.failureCause,
        });
      }
      throw error;
    }
  },
};

export default apiClient;
export { apiClient };
