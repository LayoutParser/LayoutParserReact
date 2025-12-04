import type { LayoutElement, TreeNode } from '../types/structure';

/**
 * Converte elementos do layout em uma árvore hierárquica
 */
export const buildTreeFromLayout = (elements: LayoutElement[]): TreeNode[] => {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // Primeiro, criar todos os nós
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

  // Depois, construir a hierarquia
  elements.forEach((element) => {
    const nodeId = element.elementGuid || `node-${elements.indexOf(element)}`;
    const node = nodeMap.get(nodeId);
    
    if (!node) return;

    // Se o elemento tem elementos filhos (array de strings JSON)
    if (element.elements && element.elements.length > 0) {
      element.elements.forEach((childElementStr) => {
        try {
          // Tentar parsear se for JSON string
          let childElement: LayoutElement;
          if (typeof childElementStr === 'string') {
            try {
              childElement = JSON.parse(childElementStr);
            } catch {
              // Se não for JSON válido, pode ser um GUID
              const childNode = nodeMap.get(childElementStr);
              if (childNode) {
                node.children.push(childNode);
                childNode.level = node.level + 1;
              }
              return;
            }
          } else {
            childElement = childElementStr as LayoutElement;
          }

          // Buscar o nó filho
          const childGuid = childElement.elementGuid || childElement.elementGuid;
          if (childGuid) {
            const childNode = nodeMap.get(childGuid);
            if (childNode && !node.children.some(c => c.id === childNode.id)) {
              node.children.push(childNode);
              childNode.level = node.level + 1;
            }
          }
        } catch (error) {
          console.warn('Erro ao processar elemento filho:', error);
        }
      });
    }

    // Se não tem pai, é um nó raiz
    if (!elements.some(e => 
      e.elements?.some(el => {
        const elGuid = typeof el === 'string' ? el : (el as LayoutElement).elementGuid;
        return elGuid === element.elementGuid;
      })
    )) {
      rootNodes.push(node);
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
export const buildTreeFromFields = (fields: any[]): TreeNode[] => {
  const groupedByLine = fields.reduce((acc, field) => {
    const lineName = field.lineName || 'OUTROS';
    if (!acc[lineName]) {
      acc[lineName] = [];
    }
    acc[lineName].push(field);
    return acc;
  }, {} as Record<string, any[]>);

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

