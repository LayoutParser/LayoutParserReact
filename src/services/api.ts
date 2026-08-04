import axios from 'axios';
import type {
  ApiConfig,
  ParseErrorInfo,
  ParseErrorKind,
  ParseRequest,
  ParseResponse,
} from '../types/api';
import { createCorrelationId } from '../utils/correlation';

// Configuração da API
const getApiBaseUrl = (): string => {
  // Usar variável de ambiente se disponível
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  const hostname = window.location.hostname;
  
  // Servidor de produção
  if (hostname === '172.25.32.42') {
    return 'http://172.25.32.42:5000';
  }
  
  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Fallback: mesma origem
  return window.location.origin;
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
    // Rotas kebab-case confirmadas por handoff @lp-architect (2026-07-29) — coexistem com as
    // acima (sem hífen), que seguem servindo os endpoints já em uso (`execute`,
    // `checkMapperAvailability`). Não unificar sem confirmar com o back-end.
    // Nota: `API_CONFIG` não é exportado deste módulo (os services existentes já usam path
    // literal direto na chamada `apiClient.post(...)`, ver transformationService.ts) — as duas
    // chaves abaixo documentam a rota mesmo sem serem lidas em runtime, para não perder essa
    // fonte única de verdade quando o service for escrito.
    transformationExecutionCandidates: '/api/transformation-execution/execute-candidates',
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
apiClient.interceptors.request.use((config) => {
  const headers = (config.headers ?? {}) as any;
  if (!headers['X-Correlation-ID']) {
    headers['X-Correlation-ID'] = createCorrelationId();
  }
  config.headers = headers;
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

  constructor(info: ParseErrorInfo) {
    super(info.message);
    this.name = 'ParseRequestError';
    this.kind = info.kind;
    this.httpStatus = info.httpStatus;
    this.detectedType = info.detectedType;
    this.correlationId = info.correlationId;
  }

  /** Cópia serializável (sem o rastro de `Error`) para guardar no store. */
  toInfo(): ParseErrorInfo {
    return {
      kind: this.kind,
      message: this.message,
      httpStatus: this.httpStatus,
      detectedType: this.detectedType,
      correlationId: this.correlationId,
    };
  }
}

/** Campos que o back-end manda no corpo do 422 (ParseController). */
interface ParseErrorBody {
  success?: boolean;
  detectedType?: string;
  message?: string;
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
    return {
      detectedType: typeof body.detectedType === 'string' ? body.detectedType : undefined,
      message: typeof body.message === 'string' && body.message.trim() ? body.message : undefined,
    };
  }

  return {};
};

// Serviço de parsing
export const parseService = {
  /**
   * Envia arquivos para parsing na API
   */
  async parseFiles(request: ParseRequest): Promise<ParseResponse> {
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
      const response = await apiClient.post<ParseResponse>(
        API_CONFIG.endpoints.parse,
        formData
      );
      
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
        if (response.status === 422) {
          throw new ParseRequestError({
            kind: 'parse_error',
            message: body.message || 'Não foi possível parsear o documento com o layout informado.',
            httpStatus: response.status,
            detectedType: body.detectedType,
            correlationId,
          });
        }

        // 5xx e demais status inesperados.
        //
        // Nota: o contrato só especifica 422 / >=500 / rede. Um 4xx que não seja 422 (ex.: o
        // BadRequest do ParseController quando falta arquivo) cai aqui também — nesse caso o
        // corpo costuma trazer uma mensagem específica e útil, que é preferida ao texto
        // genérico. O texto de fallback é escolhido pelo status para não afirmar "falha do
        // servidor" diante de um 4xx, que é problema da requisição.
        const isServerFault = response.status >= 500;
        throw new ParseRequestError({
          kind: 'server_error',
          message:
            body.message ||
            (isServerFault
              ? 'O servidor encontrou uma falha ao processar o documento.'
              : `A API recusou a requisição (HTTP ${response.status}).`),
          httpStatus: response.status,
          detectedType: body.detectedType,
          correlationId,
        });
      }
      throw error;
    }
  },
};

// Log da configuração
console.log('🔧 API Config:', API_CONFIG);
console.log('📍 API URL:', API_CONFIG.baseUrl);

export default apiClient;
export { apiClient };

