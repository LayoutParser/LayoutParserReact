import React, { useEffect } from 'react';
import { layoutService } from '../../services/api/layoutService';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useAppStore } from '../../store/useAppStore';
import { loadLayoutsFromCache, saveLayoutsToCache } from '../../services/cache/layoutCache';
import LayoutCombobox from './LayoutCombobox';
import type { Layout } from '../../types/layout';
import './LayoutSearch.css';

const LayoutSearch: React.FC = () => {
  const {
    allLayouts,
    isSearching,
    searchError,
    showSearchResults,
    showSearchButton,
    setAllLayouts,
    setSelectedLayoutIndex,
    setIsSearching,
    setSearchError,
    setShowSearchResults,
    setShowSearchButton,
  } = useLayoutStore();

  const { selectedLayout, setSelectedLayout } = useAppStore();

  // Carregar layouts ao montar o componente
  useEffect(() => {
    const loadLayoutsOnMount = async () => {
      // 1. Primeiro, verificar se há cache válido no navegador
      const cachedLayouts = loadLayoutsFromCache();
      
      if (cachedLayouts && cachedLayouts.length > 0) {
        // Se tem cache válido, usar apenas o cache (não buscar da API)
        // Não mostrar botão "Buscar Layouts do Banco" - apenas o combobox
        setAllLayouts(cachedLayouts);
        setShowSearchResults(true);
        setShowSearchButton(false); // Sempre ocultar botão quando tem cache
        console.log('✅ Layouts carregados do cache do navegador:', cachedLayouts.length);
        console.log('ℹ️ Usando cache local - combobox disponível, botão de buscar oculto');
        return; // Sair aqui se tem cache válido
      }

      // 2. Se não tem cache, mostrar botão "Buscar Layouts do Banco"
      // O usuário precisa clicar no botão para buscar da API
      console.log('ℹ️ Cache não encontrado ou expirado - mostrando botão "Buscar Layouts do Banco"');
      setShowSearchButton(true);
      setShowSearchResults(false);
      setAllLayouts([]);
    };
    
    loadLayoutsOnMount();
  }, [setAllLayouts, setShowSearchResults, setShowSearchButton]);

  const handleSearchLayouts = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await layoutService.searchLayouts();

      if (result.success && result.layouts && result.layouts.length > 0) {
        // Buscar layouts da API (que busca do Redis)
        setAllLayouts(result.layouts);
        setShowSearchResults(true);
        setShowSearchButton(false); // Ocultar botão após buscar com sucesso
        
        // Salvar no cache do navegador para próxima vez
        saveLayoutsToCache(result.layouts);
        
        console.log('✅ Layouts carregados da API e salvos no cache:', result.layouts.length);
      } else {
        setSearchError('Nenhum layout encontrado');
        setShowSearchResults(false);
        setShowSearchButton(true); // Manter botão visível se não encontrou layouts
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar layouts';
      setSearchError(errorMessage);
      setShowSearchResults(false);
      setShowSearchButton(true); // Manter botão visível em caso de erro
      console.error('Erro na busca de layouts:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLayoutSelect = (layout: Layout) => {
    // Encontrar índice no allLayouts
    const index = allLayouts.findIndex(l => {
      if (l.layoutGuid && layout.layoutGuid) {
        return l.layoutGuid === layout.layoutGuid;
      }
      return l === layout;
    });
    
    setSelectedLayoutIndex(index >= 0 ? index : -1);
    setSelectedLayout(layout);
    console.log('✅ Layout selecionado:', {
      name: layout.name,
      guid: layout.layoutGuid,
      index: index
    });
  };

  const handleRefreshCache = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      // 1. Atualizar cache Redis no backend
      console.log('🔄 Atualizando cache do banco de dados...');
      const refreshResult = await layoutService.refreshCache();
      
      if (!refreshResult.success) {
        throw new Error(refreshResult.error || 'Erro ao atualizar cache');
      }

      console.log('✅ Cache Redis atualizado:', refreshResult.message);

      // 2. Buscar layouts atualizados do backend
      const result = await layoutService.searchLayouts();

      if (result.success && result.layouts && result.layouts.length > 0) {
        // Atualizar estado com dados do backend
        setAllLayouts(result.layouts);
        setShowSearchResults(true);
        setShowSearchButton(false); // Ocultar botão após atualizar com sucesso
        
        // Salvar no cache do navegador
        saveLayoutsToCache(result.layouts);
        
        console.log('✅ Layouts atualizados após refresh do cache:', result.layouts.length);
      } else {
        setSearchError('Nenhum layout encontrado após atualizar cache');
        setShowSearchResults(false);
        setShowSearchButton(true); // Mostrar botão se não encontrou layouts
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar cache';
      setSearchError(errorMessage);
      console.error('❌ Erro ao atualizar cache:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="layout-search-container">
      {/* Botão de atualizar cache - sempre visível */}
      <button
        type="button"
        onClick={handleRefreshCache}
        disabled={isSearching}
        className="refresh-btn"
      >
        {isSearching ? 'Atualizando...' : 'Atualizar Cache do Banco'}
      </button>

      {/* Botão só aparece se não houver layouts no Redis */}
      {showSearchButton && (
        <button
          type="button"
          onClick={handleSearchLayouts}
          disabled={isSearching}
          className="search-btn"
        >
          {isSearching ? 'Buscando...' : 'Buscar Layouts do Banco'}
        </button>
      )}

      {searchError && (
        <div className="error-message">
          ❌ {searchError}
        </div>
      )}

      {/* Combobox de layouts - aparece sempre que houver layouts carregados */}
      {(showSearchResults || allLayouts.length > 0) && allLayouts.length > 0 && (
        <div className="layout-combobox-wrapper">
          <LayoutCombobox
            layouts={allLayouts}
            onSelect={handleLayoutSelect}
            selectedLayout={selectedLayout}
          />
        </div>
      )}
    </div>
  );
};

export default LayoutSearch;

