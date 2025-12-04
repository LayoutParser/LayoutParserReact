import { create } from 'zustand';
import type { TreeNode } from '../types/structure';

interface StructureState {
  treeData: TreeNode[];
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  
  setTreeData: (data: TreeNode[]) => void;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectNode: (nodeId: string | null) => void;
  isExpanded: (nodeId: string) => boolean;
}

export const useStructureStore = create<StructureState>((set, get) => ({
  treeData: [],
  expandedNodes: new Set<string>(),
  selectedNodeId: null,

  setTreeData: (data) => set({ treeData: data }),

  toggleNode: (nodeId) => {
    const { expandedNodes } = get();
    const newExpanded = new Set(expandedNodes);
    
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    
    set({ expandedNodes: newExpanded });
  },

  expandAll: () => {
    const { treeData } = get();
    const allNodeIds = new Set<string>();
    
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    
    collectIds(treeData);
    set({ expandedNodes: allNodeIds });
  },

  collapseAll: () => {
    set({ expandedNodes: new Set<string>() });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  isExpanded: (nodeId) => {
    return get().expandedNodes.has(nodeId);
  },
}));

