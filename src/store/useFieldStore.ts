import { create } from 'zustand';
import type { Field, FieldGroup } from '../types/field';

interface FieldState {
  fields: Field[];
  fieldGroups: FieldGroup[];
  selectedField: Field | null;
  highlightedFields: Set<string>;

  setFields: (fields: Field[]) => void;
  selectField: (field: Field | null) => void;
  highlightField: (fieldId: string | null) => void;
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

  setFields: fields => {
    // A ocorrência faz parte da identidade física da linha. Agrupar só por lineName fazia
    // registros repetidos compartilharem seleção e posição, o que não é seguro para edição.
    const groupsMap = new Map<string, Field[]>();

    fields.forEach(field => {
      const key = `${field.lineName}\u0000${field.lineSequence ?? ''}\u0000${field.occurrence ?? 1}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(field);
    });

    const fieldGroups: FieldGroup[] = Array.from(groupsMap.values()).map(groupFields => ({
      lineName: groupFields[0]?.lineName ?? 'OUTROS',
      lineGuid: groupFields[0]?.lineGuid,
      fields: [...groupFields].sort(
        (a, b) => (a.startPosition ?? a.sequence ?? 0) - (b.startPosition ?? b.sequence ?? 0)
      ),
      sequence: groupFields[0]?.sequence ?? 0,
      lineSequence: groupFields[0]?.lineSequence,
      occurrence: groupFields[0]?.occurrence ?? 1,
    }));

    set({ fields, fieldGroups });
  },

  selectField: field => {
    set({ selectedField: field });
    if (field) {
      get().highlightField(generateFieldId(field));
    }
  },

  highlightField: fieldId => {
    // Limpar highlights anteriores e destacar apenas o campo selecionado
    if (fieldId) {
      set({ highlightedFields: new Set([fieldId]) });
    } else {
      set({ highlightedFields: new Set<string>() });
    }
  },

  clearHighlights: () => {
    set({ highlightedFields: new Set<string>() });
  },

  getFieldsByLine: lineName => {
    return get().fields.filter(field => field.lineName === lineName);
  },

  getFieldById: fieldId => {
    const parts = fieldId.split('_');
    if (parts.length < 2) return null;
    const lineName = parts[0];
    const fieldName = parts.slice(1).join('_');
    return get().fields.find(f => f.lineName === lineName && f.fieldName === fieldName) || null;
  },
}));
