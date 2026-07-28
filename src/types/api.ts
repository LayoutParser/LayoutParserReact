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
  transformationsStatus?: 'completed' | 'processing' | 'not_applicable' | 'error';
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

