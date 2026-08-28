// Tipos para campos parseados

export interface Field {
  lineName: string;
  fieldName: string;
  value: string;
  startPosition?: number;
  length?: number;
  // Comprimento do valor já alinhado informado pela API. Pode ser menor que `length`, que no
  // front representa a largura física declarada do campo e é usada para edição posicional.
  parsedLength?: number;
  isValid?: boolean;
  hasWarning?: boolean;
  errorMessage?: string;
  warningMessage?: string;
  // Informações adicionais do campo
  fieldGuid?: string;
  lineGuid?: string;
  sequence?: number;
  dataType?: string;
  lineSequence?: string; // Sequência da linha (ex: "000", "001")
  occurrence?: number; // Ocorrência da linha no documento
  occurrenceCount?: number; // Total de ocorrências físicas da linha/campo
  // Entrada lógica agregada pela API (ex.: concatenação das LINHA081). Não representa uma
  // linha física e, portanto, nunca pode ser exibida nem editada no TXT posicional.
  isAggregatedOccurrence?: boolean;
}

export interface FieldGroup {
  lineName: string;
  lineGuid?: string;
  fields: Field[];
  sequence: number;
  lineSequence?: string;
  occurrence?: number;
}

/**
 * Grupo de linha como o FieldDisplay consome. Pode vir pronto do `useFieldStore`
 * (aí é só um `FieldGroup`) ou ser derivado no próprio componente, caso em que
 * carrega também a posição da linha dentro do TXT. Os extras são opcionais
 * justamente porque o caminho do store não os fornece.
 */
export interface DisplayGroup extends FieldGroup {
  lineSequence?: string;
  position?: number;
  sequential?: string;
  occurrence?: number;
}

export interface FieldSearchResult {
  field: Field;
  lineName: string;
  matchType: 'name' | 'value' | 'guid';
  matchIndex: number;
}
