import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AnalysisHistoryRequestError,
  analysisHistoryService,
} from '../../../services/api/analysisHistoryService';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import type { AnalysisHistoryDetail, AnalysisHistorySummary } from '../../../types/analysisHistory';
import './AnalysisArchive.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = (value: string) => dateFormatter.format(new Date(value));

const sourceLabels: Record<AnalysisHistorySummary['source'], string> = {
  upload: 'Upload manual',
  auto: 'Detecção automática',
};

// Rótulos conhecidos para `detectedType` (string livre da API — ver src/types/analysisHistory.ts).
// Valores fora deste dicionário caem no fallback (o próprio valor cru), já que a API não expõe
// um enum fechado para esse campo.
const fiscalTypeLabels: Record<string, string> = {
  nfe: 'NF-e',
  cte: 'CT-e',
  mdfe: 'MDF-e',
  nfse: 'NFS-e',
  nfcom: 'NFCom',
};

const fiscalTypeLabel = (detectedType: string | null): string => {
  if (!detectedType) return 'Não identificado';
  return fiscalTypeLabels[detectedType.toLowerCase()] ?? detectedType;
};

const ALL_TYPES_FILTER = '__all__';
const UNIDENTIFIED_TYPE_FILTER = '__none__';

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const daysUntil = (isoDate: string): number =>
  Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const expirationLabel = (expiresAt: string): string => {
  const days = daysUntil(expiresAt);
  if (days <= 0) return 'Expira hoje';
  if (days === 1) return 'Expira amanhã';
  return `Expira em ${days} dias`;
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof AnalysisHistoryRequestError || error instanceof Error ? error.message : fallback;

const AnalysisArchiveList = ({ workspaceId }: { workspaceId: string }) => {
  const [items, setItems] = useState<AnalysisHistorySummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  // Filtro por tipo fiscal (#197 gap 1): a API não expõe query param para isso hoje (ver
  // contracts/api-endpoints.json), então filtramos client-side sobre os itens já carregados da
  // página atual — não inventamos paginação server-side para o filtro.
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES_FILTER);

  useEffect(() => {
    let disposed = false;
    void analysisHistoryService
      .listAnalyses(workspaceId, page, pageSize)
      .then(response => {
        if (disposed) return;
        setItems(response.items);
        setTotal(response.total);
        setStatus('ready');
      })
      .catch(loadError => {
        if (disposed) return;
        setItems([]);
        setStatus('error');
        setError(errorMessage(loadError, 'Não foi possível listar o arquivo de análises.'));
      });
    return () => {
      disposed = true;
    };
  }, [workspaceId, page, reloadTick]);

  const handleDelete = async (analysisId: string) => {
    setDeletingId(analysisId);
    try {
      await analysisHistoryService.deleteAnalysis(workspaceId, analysisId);
      setConfirmingId(null);
      setReloadTick(tick => tick + 1);
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Não foi possível excluir esta análise.'));
    } finally {
      setDeletingId(null);
    }
  };

  if (status === 'loading') {
    return (
      <section className="analysis-archive-section" aria-busy="true" aria-live="polite">
        <span className="analysis-archive-loader" aria-hidden="true" />
        <p>Carregando arquivo de análises…</p>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="analysis-archive-section" role="alert">
        <p className="analysis-archive-kicker">Arquivo indisponível</p>
        <p>{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="analysis-archive-section">
        <div className="analysis-archive-empty">
          <h3>Nenhuma análise arquivada ainda</h3>
          <p>
            Processe um documento com o workspace selecionado para que os arquivos anexados apareçam
            aqui.
          </p>
        </div>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Opções derivadas dos itens já carregados na página atual — só oferece filtrar por tipos que
  // realmente aparecem aqui, em vez de assumir uma lista fixa que a API não confirma.
  const availableTypes = Array.from(new Set(items.map(item => item.detectedType))).sort((a, b) =>
    fiscalTypeLabel(a).localeCompare(fiscalTypeLabel(b), 'pt-BR')
  );

  const filteredItems = items.filter(item => {
    if (typeFilter === ALL_TYPES_FILTER) return true;
    if (typeFilter === UNIDENTIFIED_TYPE_FILTER) return item.detectedType === null;
    return item.detectedType === typeFilter;
  });

  return (
    <section className="analysis-archive-section" aria-labelledby="analysis-archive-title">
      <div className="analysis-archive-heading">
        <div>
          <p className="analysis-archive-kicker">Workspace</p>
          <h2 id="analysis-archive-title">Arquivo de análises</h2>
          <p>
            Arquivos anexados junto com o layout ao processar um documento. Retenção de 90 dias.
          </p>
        </div>
      </div>

      {error && (
        <p className="analysis-archive-inline-error" role="alert">
          {error}
        </p>
      )}

      {availableTypes.length > 1 && (
        <div className="analysis-archive-filter">
          <label htmlFor="analysis-archive-type-filter">Filtrar por tipo fiscal</label>
          <select
            id="analysis-archive-type-filter"
            value={typeFilter}
            onChange={event => setTypeFilter(event.target.value)}
          >
            <option value={ALL_TYPES_FILTER}>Todos os tipos ({items.length})</option>
            {availableTypes.map(type => {
              const value = type ?? UNIDENTIFIED_TYPE_FILTER;
              const count = items.filter(item => item.detectedType === type).length;
              return (
                <option key={value} value={value}>
                  {fiscalTypeLabel(type)} ({count})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="analysis-archive-empty-filter">
          Nenhuma análise desta página corresponde ao tipo fiscal selecionado.
        </p>
      ) : (
        <ul className="analysis-archive-list">
          {filteredItems.map(item => (
            <li key={item.analysisId} className="analysis-archive-item">
              <Link to={`/workspace/analysis-archive/${encodeURIComponent(item.analysisId)}`}>
                <strong>{item.layoutName}</strong>
                <span> — {sourceLabels[item.source]}</span>
              </Link>
              <div className="analysis-archive-item__meta">
                <span>{formatDate(item.createdAt)}</span>
                <span>
                  {item.fileCount} arquivo(s) · {formatSize(item.totalSizeBytes)}
                </span>
                <span className="analysis-archive-expiration">
                  {expirationLabel(item.expiresAt)}
                </span>
              </div>
              <div className="analysis-archive-item__actions">
                {confirmingId === item.analysisId ? (
                  <>
                    <span>Excluir esta análise?</span>
                    <button
                      type="button"
                      className="analysis-archive-button analysis-archive-button--danger"
                      disabled={deletingId === item.analysisId}
                      onClick={() => void handleDelete(item.analysisId)}
                    >
                      {deletingId === item.analysisId ? 'Excluindo…' : 'Confirmar exclusão'}
                    </button>
                    <button
                      type="button"
                      className="analysis-archive-button"
                      disabled={deletingId === item.analysisId}
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="analysis-archive-button"
                    onClick={() => setConfirmingId(item.analysisId)}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="analysis-archive-pagination">
          <button
            type="button"
            className="analysis-archive-button"
            disabled={page <= 1}
            onClick={() => setPage(current => Math.max(1, current - 1))}
          >
            Anterior
          </button>
          <span>
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="analysis-archive-button"
            disabled={page >= totalPages}
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  );
};

const AnalysisArchiveDetail = ({
  workspaceId,
  analysisId,
}: {
  workspaceId: string;
  analysisId: string;
}) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AnalysisHistoryDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    void analysisHistoryService
      .getAnalysis(workspaceId, analysisId)
      .then(response => {
        if (disposed) return;
        setDetail(response);
        setStatus('ready');
      })
      .catch(loadError => {
        if (disposed) return;
        setDetail(null);
        setStatus('error');
        setError(
          loadError instanceof AnalysisHistoryRequestError && loadError.kind === 'not_found'
            ? 'Esta análise não existe, expirou ou pertence a outro usuário.'
            : errorMessage(loadError, 'Não foi possível abrir esta análise.')
        );
      });
    return () => {
      disposed = true;
    };
  }, [workspaceId, analysisId]);

  // Reabertura (#197 gap 2): leva o usuário de volta ao fluxo de parse com o layout/versão já
  // conhecidos, sem disparar parse automático — quem decide repetir a análise é o usuário.
  const handleReopen = () => {
    if (!detail) return;
    navigate('/upload', { state: { reopenLayout: detail.layout } });
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingFileId(fileId);
    try {
      const blob = await analysisHistoryService.downloadFile(workspaceId, analysisId, fileId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(errorMessage(downloadError, 'Não foi possível baixar este arquivo.'));
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (status === 'loading') {
    return (
      <main className="analysis-archive-page analysis-archive-page--state" aria-busy="true">
        <span className="analysis-archive-loader" aria-hidden="true" />
        <h1>Abrindo análise…</h1>
      </main>
    );
  }

  if (status === 'error' || !detail) {
    return (
      <main className="analysis-archive-page analysis-archive-page--state">
        <section role="alert">
          <p className="analysis-archive-kicker">Análise indisponível</p>
          <h1>Não foi possível abrir esta análise</h1>
          <p>{error}</p>
          <Link to="/workspace/analysis-archive">Voltar ao arquivo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="analysis-archive-page">
      <nav className="analysis-archive-breadcrumb" aria-label="Navegação do arquivo de análises">
        <Link to="/workspace">Workspace</Link>
        <span aria-hidden="true">/</span>
        <Link to="/workspace/analysis-archive">Arquivo de análises</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{detail.analysisId}</span>
      </nav>

      <header className="analysis-archive-hero">
        <div>
          <p className="analysis-archive-kicker">{detail.layout.layoutName}</p>
          <h1>Análise {detail.analysisId}</h1>
          <p>
            Criada em {formatDate(detail.createdAt)} · {expirationLabel(detail.expiresAt)}
          </p>
        </div>
        <button
          type="button"
          className="analysis-archive-button analysis-archive-button--primary"
          onClick={handleReopen}
        >
          Reabrir análise
        </button>
      </header>

      {error && (
        <p className="analysis-archive-inline-error" role="alert">
          {error}
        </p>
      )}

      <section className="analysis-archive-section" aria-labelledby="analysis-archive-files-title">
        <h2 id="analysis-archive-files-title">Arquivos anexados</h2>
        <ul className="analysis-archive-file-list">
          {detail.files.map(file => (
            <li key={file.fileId} className="analysis-archive-file">
              <div>
                <strong>{file.fileName}</strong>
                <span> — {file.role}</span>
                <span className="analysis-archive-file__size"> · {formatSize(file.sizeBytes)}</span>
              </div>
              <button
                type="button"
                className="analysis-archive-button analysis-archive-button--primary"
                disabled={downloadingFileId === file.fileId}
                onClick={() => void handleDownload(file.fileId, file.fileName)}
              >
                {downloadingFileId === file.fileId ? 'Baixando…' : 'Baixar'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

const AnalysisArchivePage = () => {
  const navigate = useNavigate();
  const { analysisId } = useParams();
  const { status, activeWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (status === 'ready' && !activeWorkspaceId) {
      navigate('/workspace');
    }
  }, [status, activeWorkspaceId, navigate]);

  if (status !== 'ready' || !activeWorkspaceId) {
    return (
      <main
        className="analysis-archive-page analysis-archive-page--state"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="analysis-archive-loader" aria-hidden="true" />
        <h1>Carregando workspace…</h1>
      </main>
    );
  }

  if (analysisId) {
    return (
      <AnalysisArchiveDetail
        key={analysisId}
        workspaceId={activeWorkspaceId}
        analysisId={analysisId}
      />
    );
  }

  return (
    <main className="analysis-archive-page">
      <header className="analysis-archive-hero">
        <div>
          <p className="analysis-archive-kicker">Workspace fiscal</p>
          <h1>Arquivo de análises</h1>
          <p>
            Consulte os arquivos que você anexou junto com o layout ao processar um documento. Só
            você vê suas próprias análises.
          </p>
        </div>
      </header>
      <AnalysisArchiveList key={activeWorkspaceId} workspaceId={activeWorkspaceId} />
    </main>
  );
};

export default AnalysisArchivePage;
