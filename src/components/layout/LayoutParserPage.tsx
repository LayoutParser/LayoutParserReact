import React, { useState } from 'react';
import { parseService, ParseRequestError } from '../../services/api';
import { layoutService } from '../../services/api/layoutService';
import { logService } from '../../services/api/logService';
import { useAppStore } from '../../store/useAppStore';
import { useSessionStore } from '../../store/useSessionStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import { loadLayoutsFromCache, saveLayoutsToCache } from '../../services/cache/layoutCache';
import LayoutCombobox from '../upload/LayoutCombobox';
import ParseErrorBanner from '../upload/ParseErrorBanner';
import AnalysisModeTabs from '../analysis/AnalysisModeTabs';
import DocumentSummary from '../analysis/DocumentSummary';
import FieldSearch from '../analysis/FieldSearch';
import type { ParseRequest } from '../../types/api';
import type { Layout } from '../../types/layout';
import { ALLOWED_UPLOAD_EXTENSIONS, validateUploadFile } from '../../utils/uploadValidation';
import './LayoutParserPage.css';

const LayoutParserPage: React.FC = () => {
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const txtFileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadAbortRef = React.useRef<AbortController | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [allLayouts, setAllLayouts] = useState<Layout[]>(() => loadLayoutsFromCache() ?? []);
  const [showSearchButton, setShowSearchButton] = useState(() => allLayouts.length === 0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  const {
    isUploading,
    uploadError,
    uploadProgress,
    parseError,
    selectedLayout,
    parseResult,
    setUploading,
    setUploadError,
    setUploadProgress,
    setParseError,
    setParseResult,
    setTxtContent,
    setFields,
    setSelectedLayout,
  } = useAppStore();

  React.useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
    },
    []
  );

  // Só para saber qual aba de análise está ativa (ver AnalysisModeTabs) e decidir se a busca
  // de campos faz sentido na tela — não interfere no fluxo de upload/parse abaixo.
  const { activeMode } = useTransformationStore();

  // /api/layoutdatabase/refresh-cache é rota admin no BFF (DEFAULT_ADMIN_PATHS); esconder o
  // botão para não-admin evita um controle visível que sempre resulta em 403.
  const { isAdmin } = useSessionStore();

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

    if (!file) {
      setTxtFile(null);
      return;
    }

    const validation = validateUploadFile(file, import.meta.env.VITE_MAX_UPLOAD_MB);

    if (!validation.isValid) {
      setTxtFile(null);
      e.currentTarget.value = '';
      if (txtFileInputRef.current) {
        txtFileInputRef.current.value = '';
      }
      setUploadError(validation.message);
      setParseError(null);
      return;
    }

    setTxtFile(file);
    setUploadError(null);
    setParseError(null);
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
    setUploadProgress(0);
    // Os dois estados de erro convivem (ver useAppStore) e precisam ser limpos juntos no
    // início do submit, senão sobra erro do envio anterior na tela.
    setUploadError(null);
    setParseError(null);

    try {
      const abortController = new AbortController();
      uploadAbortRef.current = abortController;
      let layoutContent = selectedLayout.decryptedContent || selectedLayout.valueContent;
      let layoutToUse = selectedLayout;

      // Se não tiver layoutContent, buscar da API
      if (!layoutContent) {
        try {
          const result = await layoutService.searchLayouts();
          if (result.success && result.layouts) {
            const fullLayout = result.layouts.find(
              l => l.layoutGuid === selectedLayout.layoutGuid || l.name === selectedLayout.name
            );

            if (fullLayout && (fullLayout.decryptedContent || fullLayout.valueContent)) {
              layoutContent = fullLayout.decryptedContent || fullLayout.valueContent;
              layoutToUse = fullLayout;
              setSelectedLayout(fullLayout);
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
        throw new Error(
          'Layout não encontrado. Por favor, atualize o cache ou busque layouts do banco.'
        );
      }

      const blob = new Blob([layoutContent], { type: 'application/xml' });
      const layoutFile = new File([blob], `${layoutToUse.name || 'layout'}.xml`, {
        type: 'application/xml',
      });

      const request: ParseRequest = {
        layoutFile,
        txtFile,
        layoutName: layoutToUse.name,
      };

      const result = await parseService.parseFiles(request, {
        signal: abortController.signal,
        onUploadProgress: setUploadProgress,
      });

      setParseResult(result);
      if (result.text) {
        setTxtContent(result.text);
      }
      if (result.fields && result.fields.length > 0) {
        setFields(result.fields);
      } else {
        setFields([]);
      }
    } catch (error) {
      if (uploadAbortRef.current?.signal.aborted) {
        setUploadError('Processamento cancelado. Nenhum resultado novo foi aplicado.');
        return;
      }

      // Falha da chamada de parse já classificada pelo service (422 x 5xx x rede) — vai para
      // `parseError` e ganha apresentação própria. Qualquer outra falha (ex.: as validações
      // locais lançadas acima, "Layout não encontrado...") continua no `uploadError` de texto.
      if (error instanceof ParseRequestError) {
        // O resultado do documento ANTERIOR precisa sair da tela junto.
        //
        // Sem isto, quem processava um arquivo com sucesso e depois falhava no seguinte ficava
        // com a árvore/estrutura do primeiro arquivo na tela ao lado do banner de erro do
        // segundo — o nome do arquivo no seletor já era o novo. Isso viola direto a regra de
        // produto da spec: quando a falha é nossa (`parser_defect`), não se apresenta arquivo
        // nenhum. E mesmo nos 422 o documento exibido não é o que o usuário acabou de enviar.
        setParseResult(null);
        setFields([]);
        setTxtContent('');
        setParseError(error.toInfo());
        logService.warn('Falha de parse classificada no front-end', {
          kind: error.kind,
          httpStatus: error.httpStatus,
          failureCause: error.failureCause,
          correlationId: error.correlationId,
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setUploadError(errorMessage);
        logService.error('Falha inesperada no fluxo de processamento', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    } finally {
      uploadAbortRef.current = null;
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
            aria-label={
              isControlsVisible ? 'Ocultar painel de controles' : 'Mostrar painel de controles'
            }
            aria-expanded={isControlsVisible}
            aria-controls="layout-controls-panel"
          >
            <span aria-hidden="true">{isControlsVisible ? '‹' : '›'}</span>
          </button>
        </div>

        {/* Top-Right: Estrutura de Layout */}
        <div className="l-top-right">
          {parseResult && parseResult.success ? (
            <div className="structure-content">
              <h2>Estrutura de Layout</h2>
              <DocumentSummary />
              {/* FieldSearch destaca campos em FieldDisplay (aba "TXT Posicional"). Na aba
                  "XML Transformação Final" esse componente não é renderizado, então buscar
                  não teria nenhum efeito visível — por isso escondemos a busca nesse modo,
                  em vez de deixar um controle que parece funcionar mas não faz nada em tela. */}
              {activeMode !== 'xml-transformacao' && <FieldSearch />}
            </div>
          ) : (
            <div className="structure-placeholder">
              <h2>Estrutura de Layout</h2>
              <p>Processe um documento primeiro para visualizar a estrutura de layout.</p>
            </div>
          )}
        </div>

        {/* Bottom-Left: Controles */}
        <div
          id="layout-controls-panel"
          className={`l-bottom-left ${isControlsVisible ? '' : 'hidden'}`}
        >
          <div className="controls-panel">
            {/* Atualizar Layout — só habilita depois de já ter carregado layouts (busca bem-
                sucedida ou cache) e só aparece para admin, já que refresh-cache é rota
                administrativa no BFF. */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleRefreshCache}
                disabled={isSearching || allLayouts.length === 0}
                className="control-btn refresh-btn"
              >
                {isSearching ? 'Atualizando...' : 'Atualizar Layout'}
              </button>
            )}

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
                <LayoutCombobox
                  layouts={allLayouts}
                  onSelect={handleLayoutSelect}
                  selectedLayout={selectedLayout}
                />
              </div>
            )}

            {/* Anexar arquivo */}
            <form onSubmit={handleSubmit} className="file-upload-form">
              <div className="file-input-wrapper">
                <label htmlFor="txtFile" className="file-label-text">
                  Arquivo do documento
                </label>
                <input
                  ref={txtFileInputRef}
                  type="file"
                  id="txtFile"
                  accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
                  onChange={handleTxtFileChange}
                  disabled={isUploading}
                  hidden
                  aria-describedby={
                    uploadError && !txtFile ? 'txtFile-status txtFile-error' : 'txtFile-status'
                  }
                  aria-invalid={Boolean(uploadError && !txtFile)}
                />
                <button
                  type="button"
                  className="file-input"
                  disabled={isUploading}
                  aria-describedby={
                    uploadError && !txtFile ? 'txtFile-status txtFile-error' : 'txtFile-status'
                  }
                  onClick={() => {
                    if (txtFileInputRef.current) {
                      txtFileInputRef.current.value = '';
                      txtFileInputRef.current.click();
                    }
                  }}
                >
                  {txtFile ? 'Trocar arquivo' : 'Selecionar arquivo'}
                </button>
                <span
                  id="txtFile-status"
                  className={`file-name ${txtFile ? 'has-file' : 'empty'}`}
                  role="status"
                  aria-live="polite"
                >
                  {txtFile
                    ? `✓ Arquivo selecionado: ${txtFile.name}`
                    : 'Nenhum arquivo selecionado'}
                </span>
              </div>

              {parseError && <ParseErrorBanner error={parseError} />}
              {uploadError && (
                <div
                  id={uploadError && !txtFile ? 'txtFile-error' : undefined}
                  className="error-message"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  ❌ {uploadError}
                </div>
              )}
              {searchError && <div className="error-message">❌ {searchError}</div>}

              <button
                type="submit"
                disabled={isUploading || !selectedLayout || !txtFile}
                className="control-btn submit-btn"
              >
                {isUploading ? 'Processando...' : 'Processar Documento'}
              </button>

              {isUploading && (
                <div className="upload-progress" aria-live="polite">
                  <label htmlFor="upload-progress-value">
                    Enviando documento{uploadProgress > 0 ? ` — ${uploadProgress}%` : '…'}
                  </label>
                  <progress id="upload-progress-value" max={100} value={uploadProgress} />
                  <button
                    type="button"
                    className="upload-cancel-btn"
                    onClick={() => uploadAbortRef.current?.abort()}
                  >
                    Cancelar processamento
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Bottom-Right: Visualização do Arquivo (oculta até escolher arquivo) */}
        <div className="l-bottom-right">
          {parseResult && parseResult.success && txtFile ? (
            <AnalysisModeTabs />
          ) : (
            <div className="file-visualization-placeholder">
              <p>Selecione um layout e anexe um documento TXT para iniciar a análise.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutParserPage;
