import { create } from 'zustand';
import type { Layout } from '../types/layout';

interface LayoutState {
  // Lista de layouts
  allLayouts: Layout[];
  filteredLayouts: Layout[];
  selectedLayoutIndex: number;
  
  // Estado de busca
  isSearching: boolean;
  searchError: string | null;
  showSearchResults: boolean;
  searchTerm: string;
  
  // Visibilidade do botão
  showSearchButton: boolean;
  
  // Ações
  setAllLayouts: (layouts: Layout[]) => void;
  setFilteredLayouts: (layouts: Layout[]) => void;
  setSelectedLayoutIndex: (index: number) => void;
  setIsSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  setShowSearchResults: (show: boolean) => void;
  setSearchTerm: (term: string) => void;
  setShowSearchButton: (show: boolean) => void;
  filterLayouts: (term: string) => void;
  reset: () => void;
}

const initialState = {
  allLayouts: [],
  filteredLayouts: [],
  selectedLayoutIndex: -1,
  isSearching: false,
  searchError: null,
  showSearchResults: false,
  searchTerm: '',
  showSearchButton: true,
};

export const useLayoutStore = create<LayoutState>((set) => ({
  ...initialState,
  
  setAllLayouts: (layouts) => {
    set({ allLayouts: layouts, filteredLayouts: layouts });
  },
  setFilteredLayouts: (layouts) => set({ filteredLayouts: layouts }),
  setSelectedLayoutIndex: (index) => set({ selectedLayoutIndex: index }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  setSearchError: (error) => set({ searchError: error }),
  setShowSearchResults: (show) => set({ showSearchResults: show }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setShowSearchButton: (show) => set({ showSearchButton: show }),
  
  filterLayouts: (term) => {
    set((state) => {
      if (!term || term.trim() === '') {
        return { filteredLayouts: state.allLayouts, searchTerm: '' };
      }
      
      const lowerTerm = term.toLowerCase();
      const filtered = state.allLayouts.filter(layout => {
        const nameMatch = layout.name?.toLowerCase().includes(lowerTerm);
        const guidMatch = layout.layoutGuid?.toLowerCase().includes(lowerTerm);
        return nameMatch || guidMatch;
      });
      
      // Se o layout selecionado não estiver mais visível, deselecionar
      let selectedIndex = state.selectedLayoutIndex;
      if (selectedIndex >= 0 && selectedIndex < state.allLayouts.length) {
        const selectedLayout = state.allLayouts[selectedIndex];
        const isStillVisible = filtered.some(l => l.layoutGuid === selectedLayout.layoutGuid);
        if (!isStillVisible) {
          selectedIndex = -1;
        }
      }
      
      return { 
        filteredLayouts: filtered, 
        searchTerm: term,
        selectedLayoutIndex: selectedIndex,
      };
    });
  },
  
  reset: () => set(initialState),
}));

