import React, { useEffect } from 'react';
import { useSearchStore } from '../../store/useSearchStore';
import { useFieldStore } from '../../store/useFieldStore';
import './FieldSearch.css';

const FieldSearch: React.FC = () => {
  const { searchTerm, searchResults, currentResultIndex, isSearching, setSearchTerm, performSearch, clearSearch, nextResult, previousResult } = useSearchStore();
  const { fields } = useFieldStore();

  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch(fields, searchTerm);
    } else {
      clearSearch();
    }
  }, [searchTerm, fields, performSearch, clearSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        previousResult();
      } else {
        nextResult();
      }
    } else if (e.key === 'Escape') {
      clearSearch();
    }
  };

  return (
    <div className="field-search">
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Buscar campos (nome, valor ou GUID)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        {isSearching && searchResults.length > 0 && (
          <div className="search-results-info">
            {currentResultIndex + 1} / {searchResults.length}
          </div>
        )}
      </div>
      
      {isSearching && searchResults.length > 0 && (
        <div className="search-controls">
          <button
            type="button"
            onClick={previousResult}
            className="search-nav-btn"
            title="Anterior (Shift+Enter)"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={nextResult}
            className="search-nav-btn"
            title="Próximo (Enter)"
          >
            ▼
          </button>
        </div>
      )}
      
      {isSearching && searchResults.length === 0 && searchTerm.trim() && (
        <div className="search-no-results">
          Nenhum campo encontrado
        </div>
      )}
    </div>
  );
};

export default FieldSearch;

