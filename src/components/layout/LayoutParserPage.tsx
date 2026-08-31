import React, { useState } from 'react';
import { parseService, ParseRequestError } from '../../services/api';
import { layoutService } from '../../services/api/layoutService';
import { logService } from '../../services/api/logService';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useSearchStore } from '../../store/useSearchStore';
import { useSessionStore } from '../../store/useSessionStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import { useTraceabilityStore } from '../../store/useTraceabilityStore';
import { loadLayoutsFromCache, saveLayoutsToCache } from '../../services/cache/layoutCache';
import LayoutCombobox from '../upload/LayoutCombobox';
import ParseErrorBanner from '../upload/ParseErrorBanner';
import AutoLayoutDetectionPanel, {
  type AutoLayoutDetectionViewState,
} from '../upload/AutoLayoutDetectionPanel';
import AnalysisModeTabs from '../analysis/AnalysisModeTabs';
import DocumentSummary from '../analysis/DocumentSummary';
import FieldSearch from '../analysis/FieldSearch';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import type { AutoParseResponse, LayoutDetectionCandidate, ParseRequest } from '../../types/api';
import type { Layout } from '../../types/layout';
import { inspectDocumentSource } from '../../utils/documentEncoding';
import { createParsedDocumentProvenance, fileMatchesProvenance } from '../../utils/provenance';
import { ALLOWED_UPLOAD_EXTENSIONS, validateUploadFile } from '../../utils/uploadValidation';
import './LayoutParserPage.css';

type PendingInputChange = { kind: 'layout'; layout: Layout | null } | { kind: 'file'; file: File };

const LayoutParserPage: React.FC = () => {
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const txtFileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadAbortRef = React.useRef<AbortController | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [allLayouts, setAllLayouts] = useState<Layout[]>(() => loadLayoutsFromCache() ?? []);
  const [showSearchButton, setShowSearchButton] = useState(() => allLayouts.length === 0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [pendingInputChange, setPendingInputChange] = useState<PendingInputChange | null>(null);
  const [autoDetectionState, setAutoDetectionState] =
    useState<AutoLayoutDetectionViewState>('idle');
  const [autoParseResponse, setAutoParseResponse] = useState<AutoParseResponse | null>(null);
  const [lastAutoCandidate, setLastAutoCandidate] = useState<LayoutDetectionCandidate | null>(null);

  const {
    isUploading,
    uploadError,
    uploadProgress,
    parseError,
    selectedLayout,
    selectedLayoutSource,
    parseResult,
    parsedDocumentProvenance,
    editHistory,
    setUploading,
    setUploadError,
    setUploadProgress,
    setParseError,
    setSelectedLayout,
    replaceParsedDocument,
    clearParsedDocument,
  } = useAppStore();

  React.useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
    },
    []
  );

  // Só para saber qual aba de análise está ativa (ver AnalysisModeTabs) e decidir se a busca
  // de campos faz sentido na tela — não interfere no fluxo de upload/parse abaixo.
  const { activeMode, reset: resetTransformation } = useTransformationStore();

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

  const saveCatalog = (layouts: Layout[]): Layout[] => {
    setAllLayouts(layouts);
    setShowSearchButton(false);
    saveLayoutsToCache(layouts);
    return layouts;
  };

  const fetchLayoutCatalog = async (): Promise<Layout[]> => {
    const result = await layoutService.searchLayouts();
    if (!result.success || !result.layouts || result.layouts.length === 0) {
      throw new Error('Nenhum layout foi encontrado no catálogo.');
    }
    return saveCatalog(result.layouts);
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

  const invalidateParsedDocument = () => {
    uploadAbortRef.current?.abort();
    clearParsedDocument();
    setAutoDetectionState('idle');
    setAutoParseResponse(null);
    setLastAutoCandidate(null);
    resetTransformation();
    useFieldStore.getState().reset();
    useSearchStore.getState().clearSearch();
    useTraceabilityStore.getState().reset();
  };

  const applyInputChange = (change: PendingInputChange) => {
    const changed =
      change.kind === 'layout'
        ? change.layout?.layoutGuid !== selectedLayout?.layoutGuid ||
          change.layout?.name !== selectedLayout?.name
        : change.file.name !== txtFile?.name ||
          change.file.size !== txtFile?.size ||
          change.file.lastModified !== txtFile?.lastModified;

    if (changed) {
      invalidateParsedDocument();
    }

    if (change.kind === 'layout') {
      setSelectedLayout(change.layout, change.layout ? 'manual' : null);
    } else {
      // Um layout identificado para o arquivo anterior não vira seleção manual implícita para o
      // próximo documento. Somente uma escolha feita no combobox permanece como override.
      if (selectedLayoutSource !== 'manual') {
        setSelectedLayout(null);
      }
      setTxtFile(change.file);
    }

    setUploadError(null);
    setParseError(null);
    setPendingInputChange(null);
  };

  const requestInputChange = (change: PendingInputChange) => {
    if (isUploading) return;

    const changesCurrentInput =
      change.kind === 'layout'
        ? change.layout?.layoutGuid !== selectedLayout?.layoutGuid ||
          change.layout?.name !== selectedLayout?.name
        : change.file.name !== txtFile?.name ||
          change.file.size !== txtFile?.size ||
          change.file.lastModified !== txtFile?.lastModified;

    if (changesCurrentInput && parseResult && editHistory.length > 0) {
      setPendingInputChange(change);
      return;
    }

    applyInputChange(change);
  };

  const handleLayoutSelect = (layout: Layout) => {
    requestInputChange({ kind: 'layout', layout });
  };

  const handleAutomaticLayoutMode = () => {
    requestInputChange({ kind: 'layout', layout: null });
  };

  const handleTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const validation = validateUploadFile(file, import.meta.env.VITE_MAX_UPLOAD_MB);

    if (!validation.isValid) {
      e.currentTarget.value = '';
      if (txtFileInputRef.current) {
        txtFileInputRef.current.value = '';
      }
      setUploadError(validation.message);
      setParseError(null);
      return;
    }

    requestInputChange({ kind: 'file', file });
  };

  const findLayoutInCatalog = (
    layouts: Layout[],
    identity: Pick<Layout, 'layoutGuid' | 'name'>
  ): Layout | undefined => {
    const normalizedGuid = identity.layoutGuid.trim().toLowerCase();
    return layouts.find(layout => {
      const guidMatches =
        normalizedGuid.length > 0 && layout.layoutGuid.trim().toLowerCase() === normalizedGuid;
      return guidMatches || layout.name === identity.name;
    });
  };

  const resolveManualLayout = async (layout: Layout): Promise<Layout> => {
    if (layout.decryptedContent || layout.valueContent) return layout;
    const completeLayout = findLayoutInCatalog(await fetchLayoutCatalog(), layout);
    if (!completeLayout?.decryptedContent && !completeLayout?.valueContent) {
      throw new Error(
        'Layout não encontrado. Por favor, atualize o cache ou busque layouts do banco.'
      );
    }
    return completeLayout;
  };

  const resetAnalysisConsumers = () => {
    useFieldStore.getState().reset();
    useSearchStore.getState().clearSearch();
    useTraceabilityStore.getState().reset();
  };

  const processDocument = async (candidateOverride?: LayoutDetectionCandidate) => {
    if (!txtFile) {
      setUploadError('Por favor, selecione o arquivo de dados (TXT/MQSeries/IDoc)');
      return;
    }

    const usesAutomaticDetection =
      !selectedLayout || selectedLayoutSource !== 'manual' || Boolean(candidateOverride);
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setParseError(null);
    if (usesAutomaticDetection) {
      setAutoDetectionState('loading');
      setLastAutoCandidate(candidateOverride ?? null);
    }

    try {
      const abortController = new AbortController();
      uploadAbortRef.current = abortController;

      if (usesAutomaticDetection) {
        const automaticOverride =
          candidateOverride?.layoutGuid ??
          (selectedLayoutSource === 'ranked_candidate' ? selectedLayout?.layoutGuid : undefined);
        const [response, documentSource] = await Promise.all([
          parseService.parseAutomatically(
            {
              documentFile: txtFile,
              ...(automaticOverride ? { layoutGuidOverride: automaticOverride } : {}),
            },
            {
              signal: abortController.signal,
              onUploadProgress: setUploadProgress,
            }
          ),
          inspectDocumentSource(txtFile),
        ]);

        setAutoParseResponse(response);

        const expectsParse = response.detection.status === 'unique' || Boolean(automaticOverride);

        if (response.parseResult?.success) {
          const detectedLayout =
            response.detection.selectedLayout ??
            (automaticOverride
              ? (response.detection.candidates.find(
                  candidate => candidate.layoutGuid === automaticOverride
                ) ?? candidateOverride)
              : undefined);
          if (!detectedLayout) {
            throw new Error('A API não informou qual layout produziu o parse automático.');
          }

          // O XML descriptografado permanece dentro da API. Para os consumidores da tela basta a
          // identidade pública do layout; reprocessamentos automáticos usam novamente o GUID.
          const layoutToUse: Layout = {
            layoutGuid: detectedLayout.layoutGuid,
            name: detectedLayout.name,
            ...(response.parseResult.layout?.description
              ? { description: response.parseResult.layout.description }
              : {}),
            ...(response.parseResult.layout?.layoutType
              ? { layoutType: response.parseResult.layout.layoutType }
              : {}),
          };
          const selectionSource = automaticOverride ? 'ranked_candidate' : 'auto_unique';
          setSelectedLayout(layoutToUse, selectionSource);
          replaceParsedDocument(
            {
              ...response.parseResult,
              correlationId:
                response.parseResult.correlationId || response.correlationId || undefined,
            },
            documentSource,
            createParsedDocumentProvenance(documentSource, layoutToUse, {
              selectionSource,
              ...(response.correlationId ? { correlationId: response.correlationId } : {}),
              algorithmVersion: response.detection.algorithmVersion,
              catalogVersion: response.detection.catalogVersion,
              ...(selectionSource === 'ranked_candidate'
                ? {
                    candidateRank: detectedLayout.rank,
                    matchScore: detectedLayout.matchScore,
                  }
                : {}),
            })
          );
          resetAnalysisConsumers();
        } else if (expectsParse) {
          throw new Error(
            'A API confirmou o layout, mas não devolveu o resultado do parse do documento.'
          );
        } else {
          // Ambiguidade e ausência de candidato são resultados válidos da detecção, não erros.
          // Nenhum layout ou parse anterior pode permanecer associado a esses estados.
          clearParsedDocument();
          setSelectedLayout(null);
          resetTransformation();
          resetAnalysisConsumers();
        }

        setAutoDetectionState('ready');
        return;
      }

      const layoutToUse = await resolveManualLayout(selectedLayout);
      const layoutContent = layoutToUse.decryptedContent || layoutToUse.valueContent;
      if (!layoutContent) {
        throw new Error(
          'Layout não encontrado. Por favor, atualize o cache ou busque layouts do banco.'
        );
      }

      const layoutFile = new File([layoutContent], `${layoutToUse.name || 'layout'}.xml`, {
        type: 'application/xml',
      });
      const request: ParseRequest = {
        layoutFile,
        txtFile,
        layoutName: layoutToUse.name,
      };
      const [result, documentSource] = await Promise.all([
        parseService.parseFiles(request, {
          signal: abortController.signal,
          onUploadProgress: setUploadProgress,
        }),
        inspectDocumentSource(txtFile),
      ]);

      setSelectedLayout(layoutToUse, 'manual');
      replaceParsedDocument(
        result,
        documentSource,
        createParsedDocumentProvenance(documentSource, layoutToUse, {
          selectionSource: 'manual',
          ...(result.correlationId ? { correlationId: result.correlationId } : {}),
        })
      );
      resetAnalysisConsumers();
    } catch (error) {
      if (uploadAbortRef.current?.signal.aborted) {
        setUploadError('Processamento cancelado. Nenhum resultado novo foi aplicado.');
        if (usesAutomaticDetection) setAutoDetectionState('error');
        return;
      }

      if (error instanceof ParseRequestError) {
        clearParsedDocument();
        setParseError(error.toInfo());
        if (usesAutomaticDetection) setAutoDetectionState('error');
        logService.warn('Falha de parse classificada no front-end', {
          kind: error.kind,
          httpStatus: error.httpStatus,
          failureCause: error.failureCause,
          correlationId: error.correlationId,
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setUploadError(errorMessage);
        if (usesAutomaticDetection) setAutoDetectionState('error');
        logService.error('Falha inesperada no fluxo de processamento', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    } finally {
      uploadAbortRef.current = null;
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await processDocument();
  };

  const handleChooseManually = async () => {
    if (allLayouts.length > 0 || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      await fetchLayoutCatalog();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Erro ao buscar layouts');
    } finally {
      setIsSearching(false);
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
              {parsedDocumentProvenance && (
                <p className="document-provenance" role="status">
                  Resultado vinculado a <strong>{parsedDocumentProvenance.document.name}</strong>
                  {' · '}
                  {parsedDocumentProvenance.document.originalSize} bytes
                  {' · layout '}
                  <strong>{parsedDocumentProvenance.layout.name}</strong>
                  {parsedDocumentProvenance.detection?.selectionSource === 'auto_unique' &&
                    ' · identificado automaticamente'}
                  {parsedDocumentProvenance.detection?.selectionSource === 'ranked_candidate' &&
                    ' · escolhido entre layouts equivalentes'}
                </p>
              )}
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
                <div className="manual-layout-heading">
                  <span>Layout manual</span>
                  <small>Opcional — deixe vazio para a API identificar.</small>
                </div>
                <LayoutCombobox
                  layouts={allLayouts}
                  onSelect={handleLayoutSelect}
                  selectedLayout={selectedLayout}
                  disabled={isUploading}
                />
                {selectedLayout && (
                  <button
                    type="button"
                    className="automatic-layout-mode-btn"
                    disabled={isUploading}
                    onClick={handleAutomaticLayoutMode}
                  >
                    Remover seleção e identificar automaticamente
                  </button>
                )}
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

              <AutoLayoutDetectionPanel
                state={autoDetectionState}
                detection={autoParseResponse?.detection ?? null}
                correlationId={autoParseResponse?.correlationId}
                error={parseError}
                disabled={isUploading}
                onRetry={() => void processDocument(lastAutoCandidate ?? undefined)}
                onUseCandidate={candidate => void processDocument(candidate)}
                onChooseManually={() => void handleChooseManually()}
              />

              {parseError && autoDetectionState !== 'error' && (
                <ParseErrorBanner error={parseError} />
              )}
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
                disabled={isUploading || !txtFile}
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
          {parseResult &&
          parseResult.success &&
          fileMatchesProvenance(txtFile, parsedDocumentProvenance) ? (
            <AnalysisModeTabs />
          ) : (
            <div className="file-visualization-placeholder">
              <p>
                Anexe um documento TXT, MQSeries ou IDoc. A API tentará identificar o layout; a
                seleção manual é opcional.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(pendingInputChange)}
        onClose={() => {
          setPendingInputChange(null);
          if (txtFileInputRef.current) txtFileInputRef.current.value = '';
        }}
        title="Descartar alterações pendentes?"
        size="small"
      >
        <p>
          Este TXT possui {editHistory.length} alteração(ões) ainda nesta sessão. Trocar o arquivo
          ou o layout remove o resultado processado, o histórico de edição e os vínculos com o XML.
        </p>
        <div className="pending-input-change-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setPendingInputChange(null);
              if (txtFileInputRef.current) txtFileInputRef.current.value = '';
            }}
          >
            Manter documento atual
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (pendingInputChange) applyInputChange(pendingInputChange);
            }}
          >
            Descartar e trocar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default LayoutParserPage;
