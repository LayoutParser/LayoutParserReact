import type { LayoutElement, TreeNode } from '../types/structure';

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
  elements.forEach((element) => {
    const nodeId = element.elementGuid || `node-${elements.indexOf(element)}`;
    const node = nodeMap.get(nodeId);
    
    if (!node) return;

    // Se o elemento tem elementos filhos (array de strings JSON representando FieldElementVO)
    if (element.elements && element.elements.length > 0) {
      element.elements.forEach((childElementStr) => {
        try {
          // Parsear a string JSON para obter o FieldElementVO
          let childElement: any;
          if (typeof childElementStr === 'string') {
            try {
              childElement = JSON.parse(childElementStr);
            } catch (parseError) {
              console.warn('Erro ao parsear elemento filho como JSON:', parseError, childElementStr);
              return;
            }
          } else {
            childElement = childElementStr;
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
        } catch (error) {
          console.warn('Erro ao processar elemento filho:', error, childElementStr);
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

