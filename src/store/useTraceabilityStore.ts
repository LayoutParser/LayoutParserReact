import { create } from 'zustand';

import type { XmlSelectableNode } from '../utils/xmlTree';

interface TraceabilityState {
  selectedXmlNode: XmlSelectableNode | null;
  inspectorOpen: boolean;
  requestedXmlNodeId: string | null;
  requestedFieldId: string | null;
  selectXmlNode: (node: XmlSelectableNode | null) => void;
  setInspectorOpen: (open: boolean) => void;
  requestXmlNodeFocus: (node: XmlSelectableNode) => void;
  requestFieldFocus: (fieldId: string) => void;
  clearXmlFocusRequest: () => void;
  clearFieldFocusRequest: () => void;
  reset: () => void;
}

const initialState = {
  selectedXmlNode: null,
  inspectorOpen: false,
  requestedXmlNodeId: null,
  requestedFieldId: null,
};

export const useTraceabilityStore = create<TraceabilityState>(set => ({
  ...initialState,
  selectXmlNode: node =>
    set(state => ({
      selectedXmlNode: node,
      inspectorOpen: node ? true : state.inspectorOpen,
    })),
  setInspectorOpen: open => set({ inspectorOpen: open }),
  requestXmlNodeFocus: node =>
    set({
      selectedXmlNode: node,
      requestedXmlNodeId: node.id,
    }),
  requestFieldFocus: fieldId => set({ requestedFieldId: fieldId }),
  clearXmlFocusRequest: () => set({ requestedXmlNodeId: null }),
  clearFieldFocusRequest: () => set({ requestedFieldId: null }),
  reset: () => set(initialState),
}));
