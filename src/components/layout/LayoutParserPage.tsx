import React, { useState } from 'react';
import { parseService } from '../../services/api';
import { layoutService } from '../../services/api/layoutService';
import { useAppStore } from '../../store/useAppStore';
import { loadLayoutsFromCache, saveLayoutsToCache } from '../../services/cache/layoutCache';
import LayoutCombobox from '../upload/LayoutCombobox';
import StructureTree from '../analysis/StructureTree';
import FieldDisplay from '../analysis/FieldDisplay';
import DocumentSummary from '../analysis/DocumentSummary';
import FieldSearch from '../analysis/FieldSearch';
import type { ParseRequest } from '../../types/api';
import type { Layout } from '../../types/layout';
import './LayoutParserPage.css';

const LayoutParserPage: React.FC = () => {
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [allLayouts, setAllLayouts] = useState<Layout[]>([]);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  const {
    isUploading,
    uploadError,
    selectedLayout,
    parseResult,
    setUploading,
    setUploadError,
    setParseResult,
    setTxtContent,
    setFields,
    setSelectedLayout,
  } = useAppStore();

  // Carregar layouts do cache ao montar
  React.useEffect(() => {
    const cachedLayouts = loadLayoutsFromCache();
    if (cachedLayouts && cachedLayouts.length > 0) {
      setAllLayouts(cachedLayouts);
      setShowSearchButton(false);
    } else {
      setShowSearchButton(true);
    }
  }, []);

  const handleSearchLayouts = async () => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await layoutService.searchLayouts();
      if (result.success && result.layouts && result.layouts.length > 0) {
        setAllLayouts(result.layouts);
        setShowSearchButton(false);
        saveLayoutsToCache(result.layouts);
      } else {
        setSearchError('Nenhum layout encontrado');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar layouts';
      setSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefreshCache = async () => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const refreshResult = await layoutService.refreshCache();
      if (!refreshResult.success) {
        throw new Error(refreshResult.error || 'Erro ao atualizar cache');
      }
      const result = await layoutService.searchLayouts();
      if (result.success && result.layouts && result.layouts.length > 0) {
        setAllLayouts(result.layouts);
        setShowSearchButton(false);
        saveLayoutsToCache(result.layouts);
      } else {
        setSearchError('Nenhum layout encontrado após atualizar cache');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar cache';
      setSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLayoutSelect = (layout: Layout) => {
    setSelectedLayout(layout);
  };

  const handleTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTxtFile(file);
      setUploadError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLayout) {
      setUploadError('Por favor, selecione um layout do banco de dados primeiro');
      return;
    }

    if (!txtFile) {
      setUploadError('Por favor, selecione o arquivo de dados (TXT/MQSeries/IDoc)');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      let layoutContent = selectedLayout.decryptedContent || (selectedLayout as any).valueContent;
      let layoutToUse = selectedLayout;

      // Se não tiver layoutContent, buscar da API
      if (!layoutContent) {
        console.log('ℹ️ Layout sem decryptedContent, buscando da API...');
        
        try {
          const result = await layoutService.searchLayouts();
          if (result.success && result.layouts) {
            const fullLayout = result.layouts.find(
              (l) => l.layoutGuid === selectedLayout.layoutGuid || l.name === selectedLayout.name
            );

            if (fullLayout && (fullLayout.decryptedContent || (fullLayout as any).valueContent)) {
              layoutContent = fullLayout.decryptedContent || (fullLayout as any).valueContent;
              layoutToUse = fullLayout;
              setSelectedLayout(fullLayout);
              console.log('✅ Layout completo carregado da API');
            } else {
              throw new Error(
                'Layout não encontrado. Por favor, atualize o cache ou busque layouts do banco.'
              );
            }
          } else {
            throw new Error('Erro ao buscar layout da API. Por favor, atualize o cache.');
          }
        } catch (apiError) {
          throw new Error(
            `Erro ao buscar layout da API: ${apiError instanceof Error ? apiError.message : 'Erro desconhecido'}`
          );
        }
      }

      if (!layoutContent) {
        throw new Error('Layout não encontrado. Por favor, atualize o cache ou busque layouts do banco.');
      }

      const blob = new Blob([layoutContent], { type: 'application/xml' });
      const layoutFile = new File([blob], `${layoutToUse.name || 'layout'}.xml`, { type: 'application/xml' });

      const request: ParseRequest = {
        layoutFile,
        txtFile,
        layoutName: layoutToUse.name,
      };

      const result = await parseService.parseFiles(request);

      console.log('✅ Parsing concluído:', result);

      setParseResult(result);
      if (result.text) {
        setTxtContent(result.text);
      }
      if (result.fields && result.fields.length > 0) {
        console.log('✅ Salvando campos no store:', result.fields.length);
        setFields(result.fields);
      } else {
        console.warn('⚠️ Nenhum campo na resposta ou array vazio');
        setFields([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setUploadError(errorMessage);
      console.error('❌ Erro no parsing:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="layout-parser-page">
      {/* Layout em L */}
      <div className="l-layout-container">
        {/* Top-Left: Botão para ocultar/visualizar controles */}
        <div className="l-top-left">
          <button
            type="button"
            onClick={() => setIsControlsVisible(!isControlsVisible)}
            className="toggle-controls-btn"
            title={isControlsVisible ? 'Retrair menu' : 'Mostrar menu'}
          >
            {isControlsVisible ? '<<' : '>>'}
          </button>
        </div>

        {/* Top-Right: Estrutura de Layout */}
        <div className="l-top-right">
          {parseResult && parseResult.success ? (
            <div className="structure-content">
              <h2>Estrutura de Layout</h2>
              <DocumentSummary />
              <FieldSearch />
            </div>
          ) : (
            <div className="structure-placeholder">
              <h2>Estrutura de Layout</h2>
              <p>Processe um documento primeiro para visualizar a estrutura de layout.</p>
            </div>
          )}
        </div>

        {/* Bottom-Left: Controles */}
        <div className={`l-bottom-left ${isControlsVisible ? '' : 'hidden'}`}>
          <div className="controls-panel">

            {/* Atualizar Layout */}
            <button
              type="button"
              onClick={handleRefreshCache}
              disabled={isSearching}
              className="control-btn refresh-btn"
            >
              {isSearching ? 'Atualizando...' : 'Atualizar Layout'}
            </button>

            {/* Buscar Layout */}
            {showSearchButton && (
              <button
                type="button"
                onClick={handleSearchLayouts}
                disabled={isSearching}
                className="control-btn search-btn"
              >
                {isSearching ? 'Buscando...' : 'Buscar Layout'}
              </button>
            )}

            {/* Seleção de Layout */}
            {allLayouts.length > 0 && (
              <div className="layout-select-wrapper">
                <LayoutCombobox layouts={allLayouts} onSelect={handleLayoutSelect} selectedLayout={selectedLayout} />
              </div>
            )}

            {/* Anexar arquivo */}
            <form onSubmit={handleSubmit} className="file-upload-form">
              <div className="file-input-wrapper">
                <label htmlFor="txtFile" className="file-label">
                  <span className="file-label-text">Anexar arquivo</span>
                  <input
                    type="file"
                    id="txtFile"
                    accept=".txt,.mq_series,.idoc"
                    onChange={handleTxtFileChange}
                    disabled={isUploading}
                    className="file-input"
                  />
                  {txtFile && <span className="file-name">✓ {txtFile.name}</span>}
                </label>
              </div>

              {uploadError && <div className="error-message">❌ {uploadError}</div>}
              {searchError && <div className="error-message">❌ {searchError}</div>}

              <button
                type="submit"
                disabled={isUploading || !selectedLayout || !txtFile}
                className="control-btn submit-btn"
              >
                {isUploading ? 'Processando...' : 'Processar Documento'}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom-Right: Visualização do Arquivo (oculta até escolher arquivo) */}
        <div className="l-bottom-right">
          {parseResult && parseResult.success && txtFile ? (
            <div className="file-visualization">
              <div className="file-visualization-content">
                <FieldDisplay />
              </div>
              <div className="file-visualization-header">
                <StructureTree />
              </div>
            </div>
          ) : (
            <div className="file-visualization-placeholder">
              <p>Vai ficar oculto até o usuário escolher um arquivo</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default LayoutParserPage;

