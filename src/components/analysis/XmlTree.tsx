import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  flattenXmlTree,
  parseXmlToTree,
  type XmlElementNode,
  type XmlSelectableNode,
} from '../../utils/xmlTree';
import './XmlTree.css';

interface XmlTreeProps {
  /** XML bruto retornado pela API (a mesma string usada em copiar/baixar). */
  xml: string;
  emptyMessage?: string;
  xmlNamespaces?: Record<string, string> | null;
  selectedNodeId?: string | null;
  focusNodeId?: string | null;
  onSelectNode?: (node: XmlSelectableNode) => void;
  onFocusRequestHandled?: () => void;
}

const XmlTree: React.FC<XmlTreeProps> = ({
  xml,
  emptyMessage = 'Nenhum XML para exibir.',
  xmlNamespaces = null,
  selectedNodeId = null,
  focusNodeId = null,
  onSelectNode,
  onFocusRequestHandled,
}) => {
  const { root, error } = useMemo(
    () => parseXmlToTree(xml, xmlNamespaces ?? {}),
    [xml, xmlNamespaces]
  );
  const selectableNodes = useMemo(() => flattenXmlTree(root), [root]);
  const nodesById = useMemo(
    () => new Map(selectableNodes.map(node => [node.id, node])),
    [selectableNodes]
  );
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(root?.id ?? null);
  const [previousRoot, setPreviousRoot] = useState(root);
  const [renderedFocusRequest, setRenderedFocusRequest] = useState<string | null>(null);

  if (root !== previousRoot) {
    setPreviousRoot(root);
    setExpandedIds(new Set());
    setFocusedNodeId(root?.id ?? null);
  }

  if (focusNodeId && focusNodeId !== renderedFocusRequest && nodesById.has(focusNodeId)) {
    const ancestors = new Set<string>();
    let current = nodesById.get(focusNodeId);
    while (current?.parentId) {
      ancestors.add(current.parentId);
      current = nodesById.get(current.parentId);
    }
    setExpandedIds(previous => new Set([...previous, ...ancestors]));
    setFocusedNodeId(focusNodeId);
    setRenderedFocusRequest(focusNodeId);
  } else if (!focusNodeId && renderedFocusRequest) {
    setRenderedFocusRequest(null);
  }

  const toggleNode = (nodeId: string) => {
    setExpandedIds(previous => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const collectElementIds = (node: XmlElementNode, ids: Set<string>) => {
    ids.add(node.id);
    node.children.forEach(child => collectElementIds(child, ids));
  };

  const focusItem = (nodeId: string) => {
    setFocusedNodeId(nodeId);
    requestAnimationFrame(() => itemRefs.current.get(nodeId)?.focus());
  };

  useEffect(() => {
    if (!focusNodeId || renderedFocusRequest !== focusNodeId) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const item = itemRefs.current.get(focusNodeId);
        item?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        item?.focus();
        onFocusRequestHandled?.();
      });
    });
  }, [focusNodeId, renderedFocusRequest, onFocusRequestHandled]);

  const moveVisibleFocus = (
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
    const item = visibleItems[destinationIndex];
    if (item?.dataset.xmlNodeId) focusItem(item.dataset.xmlNodeId);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    node: XmlSelectableNode,
    hasDescendants: boolean,
    expanded: boolean
  ) => {
    if (event.key === 'ArrowRight' && node.kind === 'element' && hasDescendants) {
      event.preventDefault();
      if (!expanded) {
        toggleNode(node.id);
      } else {
        const firstChild = node.attributes[0] ?? node.textNode ?? node.children[0];
        if (firstChild) focusItem(firstChild.id);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (node.kind === 'element' && expanded) toggleNode(node.id);
      else if (node.parentId) focusItem(node.parentId);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveVisibleFocus(event.currentTarget, 'next');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveVisibleFocus(event.currentTarget, 'previous');
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveVisibleFocus(event.currentTarget, 'first');
    } else if (event.key === 'End') {
      event.preventDefault();
      moveVisibleFocus(event.currentTarget, 'last');
    }
  };

  const renderTreeItem = (
    node: XmlSelectableNode,
    level: number,
    label: React.ReactNode,
    hasDescendants = false,
    descendants: React.ReactNode = null
  ) => {
    const expanded = node.kind === 'element' && expandedIds.has(node.id);
    const selected = selectedNodeId === node.id;
    return (
      <li key={node.id} className="xml-tree-node" role="none">
        <button
          ref={element => {
            if (element) itemRefs.current.set(node.id, element);
            else itemRefs.current.delete(node.id);
          }}
          type="button"
          role="treeitem"
          data-xml-node-id={node.id}
          className={`xml-tree-node-header ${selected ? 'xml-tree-node-header--selected' : ''}`}
          aria-expanded={hasDescendants ? expanded : undefined}
          aria-selected={selected}
          aria-level={level}
          tabIndex={focusedNodeId === node.id ? 0 : -1}
          onFocus={() => setFocusedNodeId(node.id)}
          onClick={event => {
            if ((event.target as HTMLElement).closest('.xml-tree-toggle')) {
              toggleNode(node.id);
              return;
            }
            onSelectNode?.(node);
          }}
          onKeyDown={event => handleKeyDown(event, node, hasDescendants, expanded)}
        >
          {hasDescendants ? (
            <span className="xml-tree-toggle" aria-hidden="true">
              {expanded ? '−' : '+'}
            </span>
          ) : (
            <span className="xml-tree-spacer" aria-hidden="true" />
          )}
          {label}
        </button>
        {hasDescendants && expanded && (
          <ul className="xml-tree-children" role="group">
            {descendants}
          </ul>
        )}
      </li>
    );
  };

  const renderElement = (node: XmlElementNode, level: number): React.ReactNode => {
    const hasDescendants =
      node.attributes.length > 0 || Boolean(node.textNode) || node.children.length > 0;
    const descendants = (
      <>
        {node.attributes.map(attribute =>
          renderTreeItem(
            attribute,
            level + 1,
            <span className="xml-tree-attribute" data-testid="xml-tree-attribute">
              <span className="xml-tree-attribute-name">@{attribute.name}</span>=
              <span className="xml-tree-attribute-value">&quot;{attribute.value}&quot;</span>
            </span>
          )
        )}
        {node.textNode &&
          renderTreeItem(
            node.textNode,
            level + 1,
            <>
              <span className="xml-tree-text-label">#text</span>
              <span className="xml-tree-text">{node.textNode.value}</span>
            </>
          )}
        {node.children.map(child => renderElement(child, level + 1))}
      </>
    );

    return renderTreeItem(
      node,
      level,
      <span className="xml-tree-element-name">&lt;{node.name}&gt;</span>,
      hasDescendants,
      descendants
    );
  };

  if (error) {
    return (
      <div className="xml-tree-error" role="alert">
        ❌ {error}
      </div>
    );
  }

  if (!root) return <p className="xml-tree-empty">{emptyMessage}</p>;

  return (
    <div className="xml-tree">
      <div className="xml-tree-controls">
        <button
          type="button"
          onClick={() => {
            const ids = new Set<string>();
            collectElementIds(root, ids);
            setExpandedIds(ids);
          }}
          className="xml-tree-control-btn"
        >
          Expandir tudo
        </button>
        <button
          type="button"
          onClick={() => setExpandedIds(new Set())}
          className="xml-tree-control-btn"
        >
          Recolher tudo
        </button>
      </div>
      <ul className="xml-tree-root" role="tree" aria-label="Árvore do XML transformado">
        {renderElement(root, 1)}
      </ul>
    </div>
  );
};

export default XmlTree;
