import React, { useMemo, useState } from 'react';
import { parseXmlToTree, type XmlElementNode } from '../../utils/xmlTree';
import './XmlTree.css';

interface XmlTreeProps {
  /** XML bruto retornado pela API (a mesma string usada em copiar/baixar). */
  xml: string;
  emptyMessage?: string;
}

/**
 * Exibe um XML como árvore expansível/colapsável, reaproveitando o padrão visual e de
 * interação (expand/collapse, navegação por teclado, `role="tree"`) já usado por
 * `StructureTree.tsx` para o lado TXT. O parse usa `DOMParser` nativo — zero dependência nova
 * — e é memoizado por string de XML para não reprocessar a árvore a cada re-render.
 */
const XmlTree: React.FC<XmlTreeProps> = ({ xml, emptyMessage = 'Nenhum XML para exibir.' }) => {
  const { root, error } = useMemo(() => parseXmlToTree(xml), [xml]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [previousRoot, setPreviousRoot] = useState(root);

  // Novo XML (ex.: trocou de candidato): recomeça colapsada, mesmo padrão inicial do
  // StructureTree. Ajuste feito durante a renderização (não em efeito) para evitar o
  // re-render em cascata de um `setState` síncrono dentro de `useEffect`.
  if (root !== previousRoot) {
    setPreviousRoot(root);
    setExpandedIds(new Set());
  }

  const toggleNode = (nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const collectIds = (node: XmlElementNode, ids: Set<string>) => {
    ids.add(node.id);
    node.children.forEach(child => collectIds(child, ids));
  };

  const expandAll = () => {
    if (!root) return;
    const ids = new Set<string>();
    collectIds(root, ids);
    setExpandedIds(ids);
  };

  const collapseAll = () => setExpandedIds(new Set());

  const moveTreeItemFocus = (
    currentItem: HTMLButtonElement,
    destination: 'previous' | 'next' | 'first' | 'last'
  ) => {
    const tree = currentItem.closest('[role="tree"]');
    if (!tree) return;

    const visibleItems = Array.from(tree.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));
    const currentIndex = visibleItems.indexOf(currentItem);
    if (currentIndex < 0) return;

    const destinationIndex =
      destination === 'first'
        ? 0
        : destination === 'last'
          ? visibleItems.length - 1
          : destination === 'previous'
            ? Math.max(0, currentIndex - 1)
            : Math.min(visibleItems.length - 1, currentIndex + 1);

    visibleItems[destinationIndex]?.focus();
  };

  const handleTreeItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    nodeId: string,
    hasChildren: boolean,
    expanded: boolean
  ) => {
    if (event.key === 'ArrowRight' && hasChildren && !expanded) {
      event.preventDefault();
      toggleNode(nodeId);
    } else if (event.key === 'ArrowLeft' && hasChildren && expanded) {
      event.preventDefault();
      toggleNode(nodeId);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTreeItemFocus(event.currentTarget, 'next');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveTreeItemFocus(event.currentTarget, 'previous');
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTreeItemFocus(event.currentTarget, 'first');
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTreeItemFocus(event.currentTarget, 'last');
    }
  };

  const renderNode = (node: XmlElementNode, level: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const expanded = expandedIds.has(node.id);

    return (
      <li key={node.id} className="xml-tree-node" role="none">
        <button
          type="button"
          role="treeitem"
          className="xml-tree-node-header"
          aria-expanded={hasChildren ? expanded : undefined}
          aria-selected={false}
          aria-level={level + 1}
          onClick={() => hasChildren && toggleNode(node.id)}
          onKeyDown={event => handleTreeItemKeyDown(event, node.id, hasChildren, expanded)}
        >
          {hasChildren ? (
            <span className="xml-tree-toggle" aria-hidden="true">
              {expanded ? '−' : '+'}
            </span>
          ) : (
            <span className="xml-tree-spacer" />
          )}
          <span className="xml-tree-element-name">
            &lt;{node.name}
            {node.attributes.map(attr => (
              <span key={attr.id} className="xml-tree-attribute" data-testid="xml-tree-attribute">
                {' '}
                <span className="xml-tree-attribute-name">@{attr.name}</span>=
                <span className="xml-tree-attribute-value">&quot;{attr.value}&quot;</span>
              </span>
            ))}
            &gt;
          </span>
          {node.textContent && <span className="xml-tree-text">{node.textContent}</span>}
        </button>
        {hasChildren && expanded && (
          <ul className="xml-tree-children" role="group">
            {node.children.map(child => renderNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (error) {
    return (
      <div className="xml-tree-error" role="alert">
        ❌ {error}
      </div>
    );
  }

  if (!root) {
    return <p className="xml-tree-empty">{emptyMessage}</p>;
  }

  return (
    <div className="xml-tree">
      <div className="xml-tree-controls">
        <button type="button" onClick={expandAll} className="xml-tree-control-btn">
          Expandir tudo
        </button>
        <button type="button" onClick={collapseAll} className="xml-tree-control-btn">
          Recolher tudo
        </button>
      </div>
      <ul className="xml-tree-root" role="tree" aria-label="Árvore do XML transformado">
        {renderNode(root, 0)}
      </ul>
    </div>
  );
};

export default XmlTree;
