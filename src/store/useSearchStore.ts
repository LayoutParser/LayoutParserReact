import { create } from 'zustand';
import type { Field, FieldSearchResult } from '../types/field';

interface SearchState {
  searchTerm: string;
  searchResults: FieldSearchResult[];
  currentResultIndex: number;
  isSearching: boolean;
  
  setSearchTerm: (term: string) => void;
  performSearch: (fields: Field[], term: string) => void;
  clearSearch: () => void;
  nextResult: () => void;
  previousResult: () => void;
  goToResult: (index: number) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  searchTerm: '',
  searchResults: [],
  currentResultIndex: -1,
  isSearching: false,

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    if (!term.trim()) {
      get().clearSearch();
    }
  },

  performSearch: (fields, term) => {
    if (!term.trim()) {
      get().clearSearch();
      return;
    }

    const lowerTerm = term.toLowerCase();
    const results: FieldSearchResult[] = [];

    fields.forEach((field, index) => {
      const nameMatch = field.fieldName?.toLowerCase().includes(lowerTerm);
      const valueMatch = field.value?.toLowerCase().includes(lowerTerm);
      const guidMatch = field.fieldGuid?.toLowerCase().includes(lowerTerm);

      if (nameMatch || valueMatch || guidMatch) {
        let matchType: 'name' | 'value' | 'guid' = 'name';
        if (valueMatch) matchType = 'value';
        if (guidMatch) matchType = 'guid';

        results.push({
          field,
          lineName: field.lineName,
          matchType,
          matchIndex: index,
        });
      }
    });

    set({
      searchResults: results,
      currentResultIndex: results.length > 0 ? 0 : -1,
      isSearching: true,
    });
  },

  clearSearch: () => {
    set({
      searchTerm: '',
      searchResults: [],
      currentResultIndex: -1,
      isSearching: false,
    });
  },

  nextResult: () => {
    const { searchResults, currentResultIndex } = get();
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    set({ currentResultIndex: nextIndex });
  },

  previousResult: () => {
    const { searchResults, currentResultIndex } = get();
    if (searchResults.length === 0) return;
    
    const prevIndex = currentResultIndex <= 0 
      ? searchResults.length - 1 
      : currentResultIndex - 1;
    set({ currentResultIndex: prevIndex });
  },

  goToResult: (index) => {
    const { searchResults } = get();
    if (index >= 0 && index < searchResults.length) {
      set({ currentResultIndex: index });
    }
  },
}));

