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
  const { showLineProperties, showFieldProperties } = usePropertiesStore();

  // Construir árvore quando parseResult mudar
  useEffect(() => {
    if (!parseResult || !parseResult.success) {
      setTreeData([]);
      return;
    }

    // Usar campos do parseResult se fields estiver vazio
    const actualFields = fields.length > 0 ? fields : (parseResult.fields || []);
    
    console.log('🌳 StructureTree: Construindo árvore', {
      hasLayout: !!parseResult.layout,
      layoutElements: parseResult.layout?.elements?.length || 0,
      fieldsFromStore: fields.length,
      fieldsFromResult: parseResult.fields?.length || 0,
      actualFields: actualFields.length,
    });

    // Se tiver layout com elementos, usar buildTreeFromLayout
    // Senão, usar buildTreeFromFields (mais simples, agrupa por linha)
    let tree: TreeNode[];
    
    if (parseResult.layout?.elements && parseResult.layout.elements.length > 0) {
      console.log('🌳 Usando buildTreeFromLayout com', parseResult.layout.elements.length, 'elementos');
      tree = buildTreeFromLayout(parseResult.layout.elements);
    } else if (actualFields && actualFields.length > 0) {
      console.log('🌳 Usando buildTreeFromFields com', actualFields.length, 'campos');
      tree = buildTreeFromFields(actualFields);
    } else {
      console.warn('⚠️ StructureTree: Nenhum dado disponível para construir árvore');
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
        showFieldProperties(field);
      } else {
        // Se não encontrar campo, mostrar propriedades do elemento
        showLineProperties(node.element);
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

