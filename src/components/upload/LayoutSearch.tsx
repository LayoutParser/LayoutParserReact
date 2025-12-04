import React, { useEffect } from 'react';
import { layoutService } from '../../services/api/layoutService';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useAppStore } from '../../store/useAppStore';
import type { Layout } from '../../types/layout';
import './LayoutSearch.css';

const LayoutSearch: React.FC = () => {
  const {
    allLayouts,
    filteredLayouts,
    selectedLayoutIndex,
    isSearching,
    searchError,
    showSearchResults,
    searchTerm,
    showSearchButton,
    setAllLayouts,
    setFilteredLayouts,
    setSelectedLayoutIndex,
    setIsSearching,
    setSearchError,
    setShowSearchResults,
    setSearchTerm,
    setShowSearchButton,
    filterLayouts,
  } = useLayoutStore();

  const { setSelectedLayout } = useAppStore();

  // Verificar layouts no Redis ao carregar
  useEffect(() => {
    const checkRedisLayoutsOnLoad = async () => {
      try {
        const result = await layoutService.searchLayouts();
        
        if (result.success && result.layouts && result.layouts.length > 0) {
          const hasLayoutsInRedis = layoutService.hasLayoutsInRedis(result.layouts);
          
          if (hasLayoutsInRedis) {
            // Layouts já estão no Redis, ocultar botão e carregar automaticamente
            setShowSearchButton(false);
            setAllLayouts(result.layouts);
            setShowSearchResults(true);
            console.log('✅ Layouts carregados automaticamente do Redis');
          } else {
            // Não há layouts no Redis, mostrar botão
            setShowSearchButton(true);
          }
        } else {
          setShowSearchButton(true);
        }
      } catch (error) {
        console.error('Erro ao verificar layouts:', error);
        setShowSearchButton(true);
      }
    };
    
    checkRedisLayoutsOnLoad();
  }, [setShowSearchButton, setAllLayouts, setShowSearchResults]);

  const handleSearchLayouts = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await layoutService.searchLayouts();

      if (result.success && result.layouts && result.layouts.length > 0) {
        setAllLayouts(result.layouts);
        setShowSearchResults(true);
        
        // Verificar se há layouts no Redis e ocultar botão se necessário
        const hasLayoutsInRedis = layoutService.hasLayoutsInRedis(result.layouts);
        if (hasLayoutsInRedis) {
          setShowSearchButton(false);
        }
      } else {
        setSearchError('Nenhum layout encontrado');
        setShowSearchResults(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar layouts';
      setSearchError(errorMessage);
      setShowSearchResults(false);
      console.error('Erro na busca de layouts:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLayoutSelect = (layout: Layout, index: number) => {
    setSelectedLayoutIndex(index);
    setSelectedLayout(layout);
    console.log('✅ Layout selecionado:', layout.name);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    filterLayouts(term);
  };

  if (!showSearchButton) {
    return null; // Não mostrar botão se layouts já estão no Redis
  }

  return (
    <div className="layout-search-container">
      <button
        type="button"
        onClick={handleSearchLayouts}
        disabled={isSearching}
        className="search-btn"
      >
        {isSearching ? 'Buscando...' : 'Buscar Layouts do Banco'}
      </button>

      {searchError && (
        <div className="error-message">
          ❌ {searchError}
        </div>
      )}

      {showSearchResults && (
        <div className="search-results">
          <h4>Layouts Encontrados: {allLayouts.length}</h4>
          
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Buscar por nome ou layoutGuid..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              className="search-input"
            />
          </div>

          <div className="layout-list-container">
            {filteredLayouts.length === 0 ? (
              <p className="no-results">Nenhum layout encontrado</p>
            ) : (
              filteredLayouts.map((layout, filteredIndex) => {
                // Encontrar índice original
                const originalIndex = allLayouts.findIndex(l => l.layoutGuid === layout.layoutGuid);
                const isSelected = selectedLayoutIndex === originalIndex;
                const isInRedis = layout.decryptedContent && layout.decryptedContent.length > 0;

                return (
                  <div
                    key={layout.layoutGuid}
                    className={`layout-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleLayoutSelect(layout, originalIndex)}
                  >
                    <div className="layout-item-info">
                      <div className="layout-item-name">{layout.name || 'Sem nome'}</div>
                      <div className="layout-item-details">
                        {layout.layoutGuid && (
                          <span>GUID: {layout.layoutGuid.substring(0, 8)}... | </span>
                        )}
                        {layout.description || 'Sem descrição'}
                        <span className={`redis-badge ${isInRedis ? 'available' : 'not-available'}`}>
                          {isInRedis ? '✓ Redis' : '✗ Redis'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutSearch;

