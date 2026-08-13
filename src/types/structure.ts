// Tipos para estrutura do layout e elementos

export interface LayoutElement {
  type: string; // 'LineElementVO' | 'FieldElementVO' | etc
  elementGuid: string;
  description: string;
  sequence: number;
  name: string;
  isRequired: boolean;
  elements?: Array<string | LayoutElement>; // A API pode serializar filhos como JSON ou objetos.
  initialValue?: string; // Valor inicial da linha (ex: "000", "001", "HEADER")
  parentElement?: string;
  minimalOccurrence?: number;
  maximumOccurrence?: number;
  // Campos específicos de FieldElementVO
  startValue?: number;
  incrementValue?: number;
  lengthField?: number;
  alignmentType?: number;
  isStaticValue?: boolean;
  isCaseSensitiveValue?: boolean;
  isSequential?: boolean;
  removeWhiteSpaceType?: number;
  dataTypeGuid?: string;
}

export interface ParsedLayout {
  layoutGuid: string;
  layoutType: string;
  name: string;
  description: string;
  limitOfCaracters: number;
  elements: LayoutElement[];
}

export interface TreeNode {
  id: string;
  type: string;
  name: string;
  elementGuid: string;
  sequence: number;
  children: TreeNode[];
  element: LayoutElement;
  level: number;
  variant?: 'sap-segment';
  sourceLineName?: string;
}
