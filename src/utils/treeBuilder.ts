import type { LayoutElement, TreeNode } from '../types/structure';

/**
 * FieldElementVO como ele chega serializado dentro de `LayoutElement.elements`.
 * Toda propriedade é opcional e aparece nas duas grafias porque a API emite ora em
 * PascalCase, ora em camelCase — o código abaixo já lia as duas; isto só declara o fato.
 */
interface RawFieldElement {
  ElementGuid?: string;
  elementGuid?: string;
  Name?: string;
  name?: string;
  Sequence?: number;
  sequence?: number;
  Type?: string;
  type?: string;
  Description?: string;
  description?: string;
  IsRequired?: boolean;
  isRequired?: boolean;
}

interface RawLayoutElement {
  ElementGuid?: string;
  elementGuid?: string;
  Name?: string;
  name?: string;
  Sequence?: number;
  sequence?: number;
  Type?: string;
  type?: string;
  Description?: string;
  description?: string;
  IsRequired?: boolean;
  isRequired?: boolean;
  InitialValue?: string;
  initialValue?: string;
  ParentElement?: string;
  parentElement?: string;
  MinimalOccurrence?: number;
  minimalOccurrence?: number;
  MaximumOccurrence?: number;
  maximumOccurrence?: number;
  Elements?: unknown;
  elements?: unknown;
}

const SAP_NFE_LAYOUT_SUFFIX = '_TXT_SAP_ENVNFE_4.00_NFE';
const SAP_CONTROL_RECORD = 'EDI_DC40';
const SAP_SEGMENT_WITH_TECHNICAL_SUFFIX = /^[A-Z0-9_]+\d{3}$/i;

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const deserializeLayoutElement = (value: unknown): RawLayoutElement | null => {
  if (typeof value === 'string') {
    try {
      return deserializeLayoutElement(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' ? (value as RawLayoutElement) : null;
};

const readElementChildren = (element: RawLayoutElement): unknown[] => {
  const children = element.elements ?? element.Elements;
  if (Array.isArray(children)) return children;

  if (children && typeof children === 'object') {
    const wrapped = (children as { Element?: unknown }).Element;
    if (Array.isArray(wrapped)) return wrapped;
    if (wrapped) return [wrapped];
  }

  return [];
};

const isLineElement = (element: RawLayoutElement): boolean => {
  const type = readString(element.type ?? element.Type);
  return type.toLowerCase().includes('lineelement');
};

const resolveSapSegmentName = (element: RawLayoutElement): string | null => {
  const initialValue = readString(element.initialValue ?? element.InitialValue).trim();
  if (initialValue.toUpperCase() === SAP_CONTROL_RECORD) return SAP_CONTROL_RECORD;
  if (!SAP_SEGMENT_WITH_TECHNICAL_SUFFIX.test(initialValue)) return null;

  return initialValue.replace(/\d{3}$/, '').toUpperCase();
};

const sortTreeBySequence = (nodes: TreeNode[]): TreeNode[] =>
  nodes
    .sort((a, b) => a.sequence - b.sequence)
    .map(node => ({ ...node, children: sortTreeBySequence(node.children) }));

const setTreeLevels = (node: TreeNode, level: number): TreeNode => ({
  ...node,
  level,
  children: node.children.map(child => setTreeLevels(child, level + 1)),
});

const buildSapChildSegments = (
  values: readonly unknown[],
  parentPath: string,
  level: number
): TreeNode[] => {
  const nodes: TreeNode[] = [];

  values.forEach((value, index) => {
    const element = deserializeLayoutElement(value);
    if (!element) return;

    const path = `${parentPath}-${index}`;
    const segmentName = isLineElement(element) ? resolveSapSegmentName(element) : null;

    if (!segmentName) {
      nodes.push(...buildSapChildSegments(readElementChildren(element), path, level));
      return;
    }

    const elementGuid = readString(element.elementGuid ?? element.ElementGuid) || `sap-${path}`;
    const sourceLineName = readString(element.name ?? element.Name) || `Segmento ${segmentName}`;
    const sequence = readNumber(element.sequence ?? element.Sequence, index + 1);
    const children = buildSapChildSegments(readElementChildren(element), path, level + 1);
    const normalizedElement: LayoutElement = {
      type: readString(element.type ?? element.Type) || 'LineElementVO',
      elementGuid,
      description: readString(element.description ?? element.Description),
      sequence,
      name: sourceLineName,
      isRequired: Boolean(element.isRequired ?? element.IsRequired),
      initialValue: readString(element.initialValue ?? element.InitialValue),
      parentElement: readString(element.parentElement ?? element.ParentElement),
      minimalOccurrence: readNumber(element.minimalOccurrence ?? element.MinimalOccurrence, 0),
      maximumOccurrence: readNumber(element.maximumOccurrence ?? element.MaximumOccurrence, 0),
    };

    nodes.push({
      id: elementGuid,
      type: 'LineElementVO',
      name: segmentName,
      elementGuid,
      sequence,
      children,
      element: normalizedElement,
      level,
      variant: 'sap-segment',
      sourceLineName,
    });
  });

  return sortTreeBySequence(nodes);
};

/** Identifica a família de layouts SAP NFe sem amarrar a visualização a um cliente específico. */
export const isSapNfeLayoutName = (layoutName?: string): boolean =>
  layoutName?.trim().toUpperCase().endsWith(SAP_NFE_LAYOUT_SUFFIX) ?? false;

/**
 * Constrói a árvore de segmentos declarada no layout IDoc SAP.
 *
 * Campos posicionais são deliberadamente ignorados nesta visão: eles continuam disponíveis no
 * painel de campos. Os LineElementVO aninhados preservam a relação de segmento pai/filho e todos
 * os segmentos de primeiro nível ficam sob o registro de controle EDI_DC40.
 */
export const buildSapIdocTree = (elements: readonly unknown[]): TreeNode[] => {
  const topLevelSegments = buildSapChildSegments(elements, 'root', 0);
  const controlIndex = topLevelSegments.findIndex(node => node.name === SAP_CONTROL_RECORD);
  if (controlIndex < 0) return [];

  const controlRecord = topLevelSegments[controlIndex];
  const documentSegments = topLevelSegments.filter((_, index) => index !== controlIndex);
  const root = setTreeLevels(
    {
      ...controlRecord,
      children: sortTreeBySequence([...controlRecord.children, ...documentSegments]),
    },
    0
  );

  return [root];
};

/**
 * Subconjunto de um campo parseado que `buildTreeFromFields` realmente lê. Declarado
 * como superset tolerante (tudo opcional) para aceitar tanto o `Field` de `types/api.ts`
 * quanto o de `types/field.ts`, que divergem entre si.
 */
interface FieldLike {
  lineName?: string;
  fieldName?: string;
  fieldGuid?: string;
  sequence?: number;
  description?: string;
  isRequired?: boolean;
}

/**
 * Converte elementos do layout em uma árvore hierárquica
 */
export const buildTreeFromLayout = (elements: LayoutElement[]): TreeNode[] => {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // Primeiro, criar todos os nós de linha (LineElementVO)
  elements.forEach((element, index) => {
    const node: TreeNode = {
      id: element.elementGuid || `node-${index}`,
      type: element.type,
      name: element.name || `Elemento ${element.sequence}`,
      elementGuid: element.elementGuid,
      sequence: element.sequence,
      children: [],
      element,
      level: 0,
    };
    nodeMap.set(node.id, node);
  });

  // Depois, processar os elementos filhos (campos dentro de cada linha)
  elements.forEach(element => {
    const nodeId = element.elementGuid || `node-${elements.indexOf(element)}`;
    const node = nodeMap.get(nodeId);

    if (!node) return;

    // Se o elemento tem elementos filhos (array de strings JSON representando FieldElementVO)
    if (element.elements && element.elements.length > 0) {
      // `childElementStr` é anotado como `unknown` de propósito: o tipo declara `string[]`,
      // mas o runtime também entrega objetos já desserializados — daí o branch `else`.
      element.elements.forEach((childElementStr: unknown) => {
        try {
          // Parsear a string JSON para obter o FieldElementVO
          let childElement: RawFieldElement;
          if (typeof childElementStr === 'string') {
            try {
              childElement = JSON.parse(childElementStr) as RawFieldElement;
            } catch {
              if (import.meta.env.DEV) {
                console.warn('Elemento filho do layout contém JSON inválido.');
              }
              return;
            }
          } else {
            childElement = (childElementStr ?? {}) as RawFieldElement;
          }

          // Criar nó filho para o campo
          const childGuid = childElement.ElementGuid || childElement.elementGuid;
          const childName = childElement.Name || childElement.name || 'Campo sem nome';
          const childSequence = childElement.Sequence || childElement.sequence || 0;
          const childType = childElement.Type || childElement.type || 'FieldElementVO';

          if (childGuid) {
            // Verificar se o nó já existe (caso o campo apareça em múltiplas linhas)
            let childNode = nodeMap.get(childGuid);

            if (!childNode) {
              // Criar novo nó para o campo
              childNode = {
                id: childGuid,
                type: childType,
                name: childName,
                elementGuid: childGuid,
                sequence: childSequence,
                children: [],
                element: {
                  type: childType,
                  elementGuid: childGuid,
                  description: childElement.Description || childElement.description || '',
                  sequence: childSequence,
                  name: childName,
                  isRequired: childElement.IsRequired || childElement.isRequired || false,
                } as LayoutElement,
                level: node.level + 1,
              };
              nodeMap.set(childGuid, childNode);
            }

            // Adicionar como filho se ainda não estiver na lista
            if (!node.children.some(c => c.id === childNode!.id)) {
              node.children.push(childNode);
            }
          }
        } catch {
          if (import.meta.env.DEV) {
            console.warn('Não foi possível processar um elemento filho do layout.');
          }
        }
      });
    }

    // Se não tem pai (não é referenciado por outro elemento), é um nó raiz
    // Todos os LineElementVO são nós raiz
    if (element.type === 'LineElementVO' || element.type.includes('Line')) {
      if (!rootNodes.some(r => r.id === node.id)) {
        rootNodes.push(node);
      }
    }
  });

  // Ordenar por sequência
  const sortBySequence = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => a.sequence - b.sequence)
      .map(node => ({
        ...node,
        children: sortBySequence(node.children),
      }));
  };

  return sortBySequence(rootNodes);
};

/**
 * Converte campos parseados em uma árvore simples agrupada por linha
 */
export const buildTreeFromFields = (fields: FieldLike[]): TreeNode[] => {
  const groupedByLine = fields.reduce<Record<string, FieldLike[]>>((acc, field) => {
    const lineName = field.lineName || 'OUTROS';
    if (!acc[lineName]) {
      acc[lineName] = [];
    }
    acc[lineName].push(field);
    return acc;
  }, {});

  return Object.keys(groupedByLine)
    .sort()
    .map((lineName, index) => ({
      id: `line-${lineName}`,
      type: 'LineElementVO',
      name: lineName,
      elementGuid: `line-${lineName}`,
      sequence: index + 1,
      children: groupedByLine[lineName].map((field, fieldIndex) => ({
        id: `${lineName}_${field.fieldName}`,
        type: 'FieldElementVO',
        name: field.fieldName || 'Campo sem nome',
        elementGuid: field.fieldGuid || `${lineName}_${field.fieldName}`,
        sequence: field.sequence || fieldIndex + 1,
        children: [],
        element: {
          type: 'FieldElementVO',
          elementGuid: field.fieldGuid || `${lineName}_${field.fieldName}`,
          description: field.description || '',
          sequence: field.sequence || fieldIndex + 1,
          name: field.fieldName || 'Campo sem nome',
          isRequired: field.isRequired || false,
        } as LayoutElement,
        level: 1,
      })),
      element: {
        type: 'LineElementVO',
        elementGuid: `line-${lineName}`,
        description: `Linha ${lineName}`,
        sequence: index + 1,
        name: lineName,
        isRequired: false,
      } as LayoutElement,
      level: 0,
    }));
};
