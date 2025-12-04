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
  const { showLineProperties } = usePropertiesStore();

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

  const handleNodeClick = (node: TreeNode) => {
    selectNode(node.id);
    
    if (node.type === 'LineElementVO' || node.type.includes('Line')) {
      showLineProperties(node.element);
    } else if (node.type === 'FieldElementVO' || node.type.includes('Field')) {
      // Tentar encontrar o campo correspondente
      const field = fields.find(f => {
        // Comparar por nome do campo ou linha
        const nameMatch = f.fieldName === node.name || f.fieldName === node.element.name;
        const lineMatch = f.lineName === node.name || node.name.includes(f.lineName);
        return nameMatch || lineMatch;
      });
      
      if (field) {
        // Destacar o campo no FieldDisplay
        const { highlightField } = useFieldStore.getState();
        const fieldId = `${field.lineName}_${field.fieldName}`;
        highlightField(fieldId);
        
        // Scroll para o campo destacado
        setTimeout(() => {
          const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
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

