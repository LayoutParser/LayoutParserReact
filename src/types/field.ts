// Tipos para campos parseados

export interface Field {
  lineName: string;
  fieldName: string;
  value: string;
  startPosition?: number;
  length?: number;
  isValid?: boolean;
  hasWarning?: boolean;
  errorMessage?: string;
  warningMessage?: string;
  // Informações adicionais do campo
  fieldGuid?: string;
  lineGuid?: string;
  sequence?: number;
  dataType?: string;
}

export interface FieldGroup {
  lineName: string;
  lineGuid?: string;
  fields: Field[];
  sequence: number;
}

export interface FieldSearchResult {
  field: Field;
  lineName: string;
  matchType: 'name' | 'value' | 'guid';
  matchIndex: number;
}

