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

