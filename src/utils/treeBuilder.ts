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
