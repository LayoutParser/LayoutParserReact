import { create } from 'zustand';
import type { Field } from '../types/field';
import type { LayoutElement } from '../types/structure';

interface PropertiesState {
  selectedField: Field | null;
  selectedLine: LayoutElement | null;
  showProperties: boolean;
  propertiesType: 'field' | 'line' | null;
  
  showFieldProperties: (field: Field) => void;
  showLineProperties: (line: LayoutElement) => void;
  hideProperties: () => void;
}

export const usePropertiesStore = create<PropertiesState>((set) => ({
  selectedField: null,
  selectedLine: null,
  showProperties: false,
  propertiesType: null,

  showFieldProperties: (field) => {
    set({
      selectedField: field,
      selectedLine: null,
      showProperties: true,
      propertiesType: 'field',
    });
  },

  showLineProperties: (line) => {
    set({
      selectedField: null,
      selectedLine: line,
      showProperties: true,
      propertiesType: 'line',
    });
  },

  hideProperties: () => {
    set({
      showProperties: false,
      propertiesType: null,
    });
  },
}));

