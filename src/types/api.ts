// Tipos para a API de Layout Parser

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    parse: string;
    layoutDatabase: string;
    dataGeneration: string;
    dataGenerator: string;
    learning: string;
    xmlAnalysis: string;
    transformationExecution: string;
    transformationExecutionCandidates: string;
    xmlAnalysisDiagnose: string;
    testing: string;
    metrics: string;
  };
}

export interface ParseRequest {
  layoutFile: File;
  txtFile: File;
  layoutName?: string;
  layoutType?: string;
  layoutConfig?: LayoutConfig;
}

export interface LayoutConfig {
  name: string;
  lineLength: number;
  hasFixedLength: boolean;
  encoding: string;
  splitMethod: string;
}

export interface LineValidationInfo {
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
  // Map<"Name#Sequence", startPosition (1-based)>. Confirmado com @lp-backend-dev.
  // NOTA: a chave NÃO é mais o fieldName puro — layouts com nomes de campo duplicados na
  // mesma linha (ex: LINHA037/038/055/090 do layout NFe da Fiat) colidiam e faziam vários
  // campos apontarem para a mesma posição. Chave composta "Name#Sequence" resolve a colisão
  // (ex: "ValorDaBaseDeCalculoDoFCPRetidoAnteriormente#9" vs "...#10").
  calculatedPositions?: Record<string, number>;
}

export interface ParseResponse {
  success: boolean;
  detectedType?: string;
  layout?: Layout;
  fields?: Field[];
  text?: string;
  errors?: string[];
  warnings?: string[];
  documentStructure?: any;
  summary?: {
    totalLines?: number;
    totalFields?: number;
    validFields?: number;
    warningFields?: number;
    errorFields?: number;
  };
  lineValidations?: LineValidationInfo[]; // NOVO: Validações e posições calculadas pelo back-end
  validationErrors?: DocumentValidationError[]; // Erros de validação de tamanho de linha
  validationWarning?: string; // Aviso se houver erros de validação
  // Estado assíncrono da transformação XML (Sysmiddle/TCL-XSL) associada a este parse.
  // 'not_applicable' quando o layout não tem Mapper cadastrado (ver transformationService).
  // Usado por AnalysisModeTabs para refletir loading/erro sem precisar de polling manual.
  //
  // ⚠️ ATENÇÃO — 'not_applicable' é AMBÍGUO NA ORIGEM: o back-end emite a mesma string em dois
  // pontos distintos do ParseController — quando o gate `detectedType == "mqseries"` barra o
  // documento (nem chegou a rodar) e quando o pathway rodou mas nenhum mapper serviu. O front
  // NÃO tem como distinguir os dois casos hoje; `transformationsReason` abaixo é o campo que
  // resolveria isso, mas ele ainda não é emitido. Não invente distinção que o dado não suporta.
  transformationsStatus?: 'completed' | 'processing' | 'not_applicable' | 'error';
  // Motivo detalhado da ausência de transformação. ADITIVO E OPCIONAL: contrato antecipado da
  // Fase 3 do back-end (spec §1.6) — enquanto não for emitido, a UI cai no texto genérico.
  transformationsReason?:
    | 'type_not_positional'
    | 'no_mapper'
    | 'empty_input'
    | 'timeout_sync'
    | 'structural_error';
}

/**
 * Classificação de uma falha ao chamar POST /api/parse/upload.
 *
 * Existe para o front parar de achatar toda falha em `new Error(string)`: um 422 é um
 * DIAGNÓSTICO DO DOCUMENTO ("não consegui parsear este documento com este layout") e precisa
 * ser apresentado de forma diferente de uma falha de sistema (5xx) ou de conectividade.
 */
export type ParseErrorKind = 'parse_error' | 'server_error' | 'network_error';

export interface ParseErrorInfo {
  kind: ParseErrorKind;
  message: string; // mensagem já pronta para exibir (no 422 vem do corpo da resposta)
  httpStatus?: number; // 422 | 5xx | undefined (rede/timeout/CORS)
  detectedType?: string; // só no 422 — tipo que o back-end detectou (ex.: "idoc")
  correlationId?: string; // header X-Correlation-ID da resposta, para o usuário reportar
}

export interface DocumentValidationError {
  lineIndex: number;
  sequence: string;
  expectedLength: number;
  actualLength: number;
  errorMessage: string;
  startPosition: number;
  endPosition: number;
}

export interface Layout {
  layoutGuid: string;
  layoutType: string;
  name: string;
  description: string;
  limitOfCaracters: number;
  elements: LayoutElement[];
}

export interface LayoutElement {
  type: string;
  elementGuid: string;
  description: string;
  sequence: number;
  name: string;
  isRequired: boolean;
  elements?: string[];
  initialValue?: string; // Valor inicial da linha (ex: "000", "001", "HEADER")
}

export interface Field {
  lineName: string;
  fieldName: string;
  value: string;
  startPosition?: number;
  length?: number;
  isValid?: boolean;
  hasWarning?: boolean;
  errorMessage?: string;
}

