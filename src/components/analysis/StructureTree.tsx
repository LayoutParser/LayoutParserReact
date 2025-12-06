import React, { useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useStructureStore } from '../../store/useStructureStore';
import { useFieldStore } from '../../store/useFieldStore';
import { usePropertiesStore } from '../../store/usePropertiesStore';
import { buildTreeFromFields, buildTreeFromLayout } from '../../utils/treeBuilder';
import type { TreeNode } from '../../types/structure';
import './StructureTree.css';

const StructureTree: React.FC = () => {
  const { parseResult, fields } = useAppStore();
  const { 
    treeData, 
    expandedNodes, 
    selectedNodeId, 
    setTreeData, 
    toggleNode, 
    expandAll, 
    collapseAll, 
    selectNode,
    isExpanded 
  } = useStructureStore();
  const { setFields } = useFieldStore();
  // const { showLineProperties } = usePropertiesStore(); // Removido temporariamente

  // Construir árvore quando parseResult mudar
  useEffect(() => {
    if (!parseResult || !parseResult.success) {
      setTreeData([]);
      return;
    }

    // Usar campos do parseResult se fields estiver vazio
    const actualFields = fields.length > 0 ? fields : (parseResult.fields || []);
    
    // Verificar se elements é um array de strings JSON ou objetos
    const layoutElements = parseResult.layout?.elements;
    const hasLayoutElements = layoutElements && (
      Array.isArray(layoutElements) && layoutElements.length > 0
    );
    
    console.log('🌳 StructureTree: Construindo árvore', {
      hasLayout: !!parseResult.layout,
      layoutElements: layoutElements?.length || 0,
      layoutElementsRaw: layoutElements,
      layoutFull: parseResult.layout,
      fieldsFromStore: fields.length,
      fieldsFromResult: parseResult.fields?.length || 0,
      actualFields: actualFields.length,
      documentStructure: parseResult.documentStructure,
      summary: parseResult.summary,
    });

    // Se tiver layout com elementos, usar buildTreeFromLayout
    // Senão, usar buildTreeFromFields (mais simples, agrupa por linha)
    let tree: TreeNode[];
    
    if (hasLayoutElements) {
      console.log('🌳 Usando buildTreeFromLayout com', layoutElements.length, 'elementos');
      console.log('🌳 Primeiro elemento:', layoutElements[0]);
      tree = buildTreeFromLayout(layoutElements);
      console.log('🌳 Árvore construída do layout:', tree.length, 'nós raiz');
    } else if (actualFields && actualFields.length > 0) {
      console.log('🌳 Usando buildTreeFromFields com', actualFields.length, 'campos');
      tree = buildTreeFromFields(actualFields);
    } else {
      console.warn('⚠️ StructureTree: Nenhum dado disponível para construir árvore');
      console.warn('⚠️ Layout completo:', parseResult.layout);
      console.warn('⚠️ Tentando construir árvore vazia para exibir estrutura do layout mesmo sem campos');
      // Mesmo sem campos, podemos tentar construir uma árvore básica se houver documentStructure
      tree = [];
    }

    console.log('🌳 Árvore construída com', tree.length, 'nós raiz');
    setTreeData(tree);
    setFields(actualFields);
  }, [parseResult, fields, setTreeData, setFields]);

  // Função auxiliar para encontrar a linha pai de um nó
  const findParentLine = (node: TreeNode, nodes: TreeNode[]): TreeNode | null => {
    // Se o nó já é uma linha, retornar ele mesmo
    if (node.type === 'LineElementVO' || node.type.includes('Line')) {
      return node;
    }
    
    // Buscar recursivamente na árvore
    const searchInTree = (treeNodes: TreeNode[], targetId: string, currentParent: TreeNode | null): TreeNode | null => {
      for (const n of treeNodes) {
        if (n.id === targetId) {
          return currentParent;
        }
        if (n.children.length > 0) {
          const found = searchInTree(n.children, targetId, n);
          if (found) return found;
        }
      }
      return null;
    };
    
    return searchInTree(nodes, node.id, null);
  };

  const handleNodeClick = (node: TreeNode) => {
    selectNode(node.id);
    
    if (node.type === 'LineElementVO' || node.type.includes('Line')) {
      // Quando clica em uma linha, destacar o primeiro campo da linha
      const lineName = node.name;
      const lineFields = fields.filter(f => f.lineName === lineName);
      
      if (lineFields.length > 0) {
        const { highlightField } = useFieldStore.getState();
        // Destacar o primeiro campo da linha
        const firstField = lineFields[0];
        const fieldId = `${firstField.lineName}_${firstField.fieldName}`;
        highlightField(fieldId);
        
        // Scroll para o primeiro campo
        setTimeout(() => {
          const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    } else if (node.type === 'FieldElementVO' || node.type.includes('Field')) {
      // Encontrar a linha pai do campo
      const parentLine = findParentLine(node, treeData);
      
      if (!parentLine) {
        console.warn('⚠️ Não foi possível encontrar a linha pai do campo:', node.name);
        return;
      }
      
      const lineName = parentLine.name;
      const fieldName = node.name || node.element?.name;
      
      if (!fieldName) {
        console.warn('⚠️ Nome do campo não encontrado no nó:', node);
        return;
      }
      
      // Buscar o campo correspondente usando tanto lineName quanto fieldName
      const field = fields.find(f => {
        const lineMatch = f.lineName === lineName;
        const nameMatch = f.fieldName === fieldName;
        return lineMatch && nameMatch;
      });
      
      if (field) {
        // Destacar o campo no FieldDisplay
        const { highlightField } = useFieldStore.getState();
        const fieldId = `${field.lineName}_${field.fieldName}`;
        highlightField(fieldId);
        
        console.log('✅ Campo destacado:', {
          lineName: field.lineName,
          fieldName: field.fieldName,
          fieldId,
          nodeName: node.name,
          parentLineName: lineName
        });
        
        // Scroll para o campo destacado
        setTimeout(() => {
          const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        console.warn('⚠️ Campo não encontrado:', {
          lineName,
          fieldName,
          nodeName: node.name,
          availableFields: fields.filter(f => f.lineName === lineName).map(f => f.fieldName)
        });
      }
    }
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const expanded = isExpanded(node.id);
    const selected = selectedNodeId === node.id;

    return (
      <li key={node.id} className={`tree-node ${selected ? 'selected' : ''}`}>
        <div 
          className="tree-node-header"
          onClick={() => handleNodeClick(node)}
        >
          {hasChildren && (
            <button
              className="tree-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="tree-spacer" />}
          <span className="tree-node-name">{node.name}</span>
          <span className="tree-node-type">{node.type.replace('VO', '')}</span>
        </div>
        {hasChildren && expanded && (
          <ul className="tree-children">
            {node.children.map(child => renderTreeNode(child))}
          </ul>
        )}
      </li>
    );
  };

  if (!parseResult || !parseResult.success || treeData.length === 0) {
    return (
      <div className="structure-tree-empty">
        <p>Nenhuma estrutura disponível. Processe um documento primeiro.</p>
      </div>
    );
  }

  return (
    <div className="structure-tree">
      <div className="tree-controls">
        <button type="button" onClick={expandAll} className="tree-control-btn">
          Expandir Tudo
        </button>
        <button type="button" onClick={collapseAll} className="tree-control-btn">
          Recolher Tudo
        </button>
      </div>
      
      <ul className="tree-root">
        {treeData.map(node => renderTreeNode(node))}
      </ul>
    </div>
  );
};

export default StructureTree;

