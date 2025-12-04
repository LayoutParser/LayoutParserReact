import { create } from 'zustand';
import type { Field, FieldGroup } from '../types/field';

interface FieldState {
  fields: Field[];
  fieldGroups: FieldGroup[];
  selectedField: Field | null;
  highlightedFields: Set<string>;
  
  setFields: (fields: Field[]) => void;
  selectField: (field: Field | null) => void;
  highlightField: (fieldId: string) => void;
  clearHighlights: () => void;
  getFieldsByLine: (lineName: string) => Field[];
  getFieldById: (fieldId: string) => Field | null;
}

const generateFieldId = (field: Field): string => {
  return `${field.lineName}_${field.fieldName}`;
};

export const useFieldStore = create<FieldState>((set, get) => ({
  fields: [],
  fieldGroups: [],
  selectedField: null,
  highlightedFields: new Set<string>(),

  setFields: (fields) => {
    // Agrupar campos por linha
    const groupsMap = new Map<string, Field[]>();
    
    fields.forEach(field => {
      if (!groupsMap.has(field.lineName)) {
        groupsMap.set(field.lineName, []);
      }
      groupsMap.get(field.lineName)!.push(field);
    });

    const fieldGroups: FieldGroup[] = Array.from(groupsMap.entries()).map(([lineName, fields]) => ({
      lineName,
      fields: fields.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
      sequence: fields[0]?.sequence || 0,
    })).sort((a, b) => a.sequence - b.sequence);

    set({ fields, fieldGroups });
  },

  selectField: (field) => {
    set({ selectedField: field });
    if (field) {
      get().highlightField(generateFieldId(field));
    }
  },

  highlightField: (fieldId) => {
    const { highlightedFields } = get();
    const newHighlights = new Set(highlightedFields);
    newHighlights.add(fieldId);
    set({ highlightedFields: newHighlights });
  },

  clearHighlights: () => {
    set({ highlightedFields: new Set<string>() });
  },

  getFieldsByLine: (lineName) => {
    return get().fields.filter(field => field.lineName === lineName);
  },

  getFieldById: (fieldId) => {
    const parts = fieldId.split('_');
    if (parts.length < 2) return null;
    const lineName = parts[0];
    const fieldName = parts.slice(1).join('_');
    return get().fields.find(f => f.lineName === lineName && f.fieldName === fieldName) || null;
  },
}));

