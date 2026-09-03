import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { workspaceService, WorkspaceRequestError } from '../../../services/api/workspaceService';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import type { AnalysisStatus, DocumentAnalysisSummary } from '../../../types/workspace';
import './WorkspaceAnalysisHistory.css';

const statusLabels: Record<AnalysisStatus, string> = {
  queued: 'Na fila',
  processing: 'Processando',
  completed: 'Concluída',
  failed: 'Falhou',
  expired: 'Expirada',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

const formatDate = (value: string | null | undefined) =>
  value ? dateFormatter.format(new Date(value)) : '—';

/**
 * Entrada técnica para abrir o histórico de um projeto. Assim como o Mapping Studio (Slice
 * 3/4), o catálogo navegável de projetos ainda não existe — o identificador é informado
 * manualmente até a API expor uma listagem de projetos por workspace.
 */
const WorkspaceAnalysisHistoryEntry = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState('');

  return (
    <main className="workspace-analysis-history workspace-analysis-history--entry">
      <p className="workspace-eyebrow">Histórico de análises</p>
      <h1>Consulte análises fiscais persistidas</h1>
      <p>Informe o identificador do projeto para listar as análises registradas neste workspace.</p>
      <form
        onSubmit={event => {
          event.preventDefault();
          if (projectId.trim()) {
            navigate(`/workspace/analyses/${encodeURIComponent(projectId.trim())}`);
          }
        }}
      >
        <label>
          Identificador do projeto
          <input
            value={projectId}
            onChange={event => setProjectId(event.target.value)}
            placeholder="GUID do projeto fiscal"
            required
          />
        </label>
        <button
          type="submit"
          className="workspace-analysis-history__button workspace-analysis-history__button--primary"
        >
          Abrir histórico
        </button>
      </form>
      <Link to="/workspace">Voltar ao workspace</Link>
    </main>
  );
};

const WorkspaceAnalysisHistoryList = ({ projectId }: { projectId: string }) => {
  const { status: workspaceStatus, activeWorkspaceId } = useWorkspaceStore();
  const [analyses, setAnalyses] = useState<DocumentAnalysisSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca pura: não toca estado. Quem chama decide como refletir o resultado (efeito, retry ou
  // "carregar mais"), evitando setState síncrono dentro do corpo do efeito.
  const fetchPage = useCallback(
    (cursor: string | null) => {
      if (!activeWorkspaceId) return Promise.reject(new Error('Workspace ainda não carregado.'));
      return workspaceService.listAnalyses(activeWorkspaceId, projectId, {
        ...(cursor ? { cursor } : {}),
      });
    },
    [activeWorkspaceId, projectId]
  );

  const applyPage = (
    page: { items: DocumentAnalysisSummary[]; nextCursor: string | null },
    append: boolean
  ) => {
    setError(null);
    setAnalyses(current => (append ? [...current, ...page.items] : page.items));
    setNextCursor(page.nextCursor);
  };

  const applyError = (loadError: unknown, append: boolean) => {
    setError(
      loadError instanceof WorkspaceRequestError || loadError instanceof Error
        ? loadError.message
        : 'Não foi possível carregar o histórico de análises.'
    );
    if (!append) {
      setAnalyses([]);
      setNextCursor(null);
    }
  };

  useEffect(() => {
    if (workspaceStatus !== 'ready' || !activeWorkspaceId) return;

    let disposed = false;
    void fetchPage(null)
      .then(page => {
        if (!disposed) applyPage(page, false);
      })
      .catch(loadError => {
        if (!disposed) applyError(loadError, false);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [activeWorkspaceId, fetchPage, workspaceStatus]);

  const retry = () => {
    setLoading(true);
    void fetchPage(null)
      .then(page => applyPage(page, false))
      .catch(loadError => applyError(loadError, false))
      .finally(() => setLoading(false));
  };

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    void fetchPage(nextCursor)
      .then(page => applyPage(page, true))
      .catch(loadError => applyError(loadError, true))
      .finally(() => setLoadingMore(false));
  };

  if (workspaceStatus === 'idle' || workspaceStatus === 'loading' || loading) {
    return (
      <main
        className="workspace-analysis-history workspace-analysis-history--state"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="workspace-analysis-history__spinner" aria-hidden="true" />
        <h1>Carregando histórico de análises…</h1>
      </main>
    );
  }

  if (error && analyses.length === 0) {
    return (
      <main className="workspace-analysis-history workspace-analysis-history--state">
        <section role="alert">
          <p className="workspace-eyebrow">Histórico indisponível</p>
          <h1>Não foi possível carregar as análises</h1>
          <p>{error}</p>
          <button
            type="button"
            className="workspace-analysis-history__button workspace-analysis-history__button--primary"
            onClick={retry}
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-analysis-history">
      <nav className="workspace-analysis-history__breadcrumb" aria-label="Navegação">
        <Link to="/workspace">Workspace</Link>
        <span aria-hidden="true">/</span>
        <Link to="/workspace/analyses">Histórico de análises</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{projectId}</span>
      </nav>

      <header className="workspace-analysis-history__header">
        <div>
          <p className="workspace-eyebrow">Projeto {projectId}</p>
          <h1>Análises persistidas</h1>
        </div>
      </header>

      {error && (
        <p className="workspace-analysis-history__error" role="alert">
          {error}
        </p>
      )}

      {analyses.length === 0 ? (
        <div className="workspace-analysis-history__empty">
          <h2>Nenhuma análise registrada</h2>
          <p>Assim que documentos forem processados neste projeto, eles aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="workspace-analysis-history__list" aria-label="Análises do projeto">
          {analyses.map(analysis => (
            <li key={analysis.analysisId} className="workspace-analysis-history__item">
              <div className="workspace-analysis-history__item-main">
                <strong>{analysis.fileName}</strong>
                <span className="workspace-analysis-history__format">
                  {analysis.format} · {analysis.fiscalProfile.documentType.toUpperCase()}
                </span>
              </div>
              <div className="workspace-analysis-history__item-meta">
                <span className="workspace-analysis-history__status" data-status={analysis.status}>
                  {statusLabels[analysis.status]}
                </span>
                <span>Criada em {formatDate(analysis.createdAt)}</span>
                <span>Concluída em {formatDate(analysis.completedAt)}</span>
              </div>
              <div className="workspace-analysis-history__item-footer">
                <code>{analysis.correlationId}</code>
                {analysis.layoutGuid && <code>{analysis.layoutGuid}</code>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <button
          type="button"
          className="workspace-analysis-history__button"
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </main>
  );
};

const WorkspaceAnalysisHistory = () => {
  const { projectId } = useParams();
  if (!projectId) {
    return <WorkspaceAnalysisHistoryEntry />;
  }
  return <WorkspaceAnalysisHistoryList key={projectId} projectId={projectId} />;
};

export default WorkspaceAnalysisHistory;
