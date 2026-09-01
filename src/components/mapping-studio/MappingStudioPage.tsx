import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  MappingDraftRequestError,
  mappingDraftService,
} from '../../services/api/mappingDraftService';
import { workspaceService } from '../../services/api/workspaceService';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type {
  MappingDraft,
  MappingDraftRule,
  MappingSuggestionJob,
  UpdateMappingDraftRuleInput,
} from '../../types/mappingDraft';
import type { MappingExplanation, MappingRuleExplanation } from '../../types/workspace';
import MappingRuleReviewCard from './MappingRuleReviewCard';
import MappingTestLabPanel from './MappingTestLabPanel';
import './MappingStudioPage.css';

type RuleUpdate = Omit<UpdateMappingDraftRuleInput, 'workspaceId' | 'draftId' | 'ruleId' | 'eTag'>;

const activeJobStatuses = new Set(['queued', 'running']);

const capabilityLabels: Array<[keyof MappingExplanation['capabilities'], string]> = [
  ['execute', 'Executar'],
  ['explain', 'Explicar'],
  ['author', 'Editar'],
  ['compile', 'Compilar'],
  ['publish', 'Publicar'],
];

const supportLabels: Record<MappingRuleExplanation['supportLevel'], string> = {
  authoritative: 'Autoritativa',
  best_effort: 'Melhor esforço',
  opaque: 'Opaca',
  unsupported: 'Não suportada',
};

const MappingStudioEntry = () => {
  const navigate = useNavigate();
  const [mappingId, setMappingId] = useState('');
  const [version, setVersion] = useState<'draft' | 'current'>('draft');

  return (
    <main className="mapping-studio-page mapping-studio-page--entry">
      <section className="mapping-studio-entry" aria-labelledby="mapping-entry-title">
        <p className="mapping-kicker">Mapping Studio fiscal</p>
        <h1 id="mapping-entry-title">Compreenda e revise uma transformação</h1>
        <p>
          Abra um draft TCL/XSLT para revisar propostas da IA ou um mapper Sysmiddle existente em
          modo estritamente explicativo.
        </p>
        <form
          onSubmit={event => {
            event.preventDefault();
            if (mappingId.trim()) {
              navigate(
                `/workspace/mapping-studio/${encodeURIComponent(mappingId.trim())}/${version}`
              );
            }
          }}
        >
          <label>
            Identificador do draft ou mapping
            <input
              value={mappingId}
              onChange={event => setMappingId(event.target.value)}
              placeholder="GUID do MappingDraft ou MapperGuid"
              required
            />
          </label>
          <label>
            Tipo de leitura
            <select
              value={version}
              onChange={event => setVersion(event.target.value as 'draft' | 'current')}
            >
              <option value="draft">Draft TCL/XSLT em revisão</option>
              <option value="current">Sysmiddle publicado (somente leitura)</option>
            </select>
          </label>
          <button type="submit" className="mapping-button mapping-button--primary">
            Abrir mapping
          </button>
        </form>
        <aside>
          O catálogo navegável de projetos e mappings ainda depende dos endpoints de listagem da
          API. Esta entrada técnica mantém o Slice 3/4 utilizável sem armazenar IDs no navegador.
        </aside>
        <Link to="/workspace">Voltar ao workspace</Link>
      </section>
    </main>
  );
};

const ExplanationRuleCard = ({ rule }: { rule: MappingRuleExplanation }) => (
  <article className="mapping-explanation-card">
    <header>
      <div>
        <span className="mapping-rule-id">Regra {rule.ruleId}</span>
        <h3>{rule.operations.join(' + ') || 'Operação não traduzida'}</h3>
      </div>
      <span className="mapping-support-badge" data-level={rule.supportLevel}>
        {supportLabels[rule.supportLevel]}
      </span>
    </header>
    <p>{rule.humanDescription}</p>
    <dl className="mapping-rule-facts">
      <div>
        <dt>Origem</dt>
        <dd>{rule.sourceRefs.join(', ') || 'Não identificada'}</dd>
      </div>
      <div>
        <dt>Destino</dt>
        <dd>{rule.targetRefs.join(', ') || 'Não identificado'}</dd>
      </div>
      <div>
        <dt>Condição</dt>
        <dd>{rule.condition || 'Sempre'}</dd>
      </div>
      <div>
        <dt>Cardinalidade</dt>
        <dd>{rule.cardinality}</dd>
      </div>
    </dl>
    {rule.evidence.length > 0 && (
      <ul className="mapping-explanation-evidence" aria-label="Evidências da explicação">
        {rule.evidence.map((item, index) => (
          <li key={`${item.kind}-${item.reference}-${index}`}>
            <span>{item.kind}</span>
            <code>{item.reference}</code>
          </li>
        ))}
      </ul>
    )}
    {rule.technicalDetail && (
      <details className="mapping-technical-details">
        <summary>Detalhe técnico</summary>
        <code>{rule.technicalDetail}</code>
      </details>
    )}
  </article>
);

const fetchMappingData = async (workspaceId: string, mappingId: string, version: string) => {
  const explanation = await workspaceService.getMappingExplanation(workspaceId, mappingId, version);
  const canLoadDraft =
    explanation.capabilities.author && explanation.engine !== 'sysmiddle' && version === 'draft';
  const draft = canLoadDraft ? await mappingDraftService.getDraft(workspaceId, mappingId) : null;
  return { explanation, draft };
};

const MappingStudioDetail = ({ mappingId, version }: { mappingId: string; version: string }) => {
  const { status, activeWorkspaceId, workspaces } = useWorkspaceStore();
  const activeWorkspaceRole = workspaces.find(
    workspace => workspace.workspaceId === activeWorkspaceId
  )?.role;
  const [explanation, setExplanation] = useState<MappingExplanation | null>(null);
  const [draft, setDraft] = useState<MappingDraft | null>(null);
  const [job, setJob] = useState<MappingSuggestionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyRuleId, setBusyRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMapping = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const next = await fetchMappingData(activeWorkspaceId, mappingId, version);
      setError(null);
      setExplanation(next.explanation);
      setDraft(next.draft);
    } catch (loadError) {
      setExplanation(null);
      setDraft(null);
      setError(
        loadError instanceof Error ? loadError.message : 'Não foi possível abrir este mapping.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, mappingId, version]);

  useEffect(() => {
    if (status !== 'ready' || !activeWorkspaceId) return;

    let disposed = false;
    void fetchMappingData(activeWorkspaceId, mappingId, version)
      .then(next => {
        if (disposed) return;
        setError(null);
        setExplanation(next.explanation);
        setDraft(next.draft);
      })
      .catch(loadError => {
        if (disposed) return;
        setExplanation(null);
        setDraft(null);
        setError(
          loadError instanceof Error ? loadError.message : 'Não foi possível abrir este mapping.'
        );
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [activeWorkspaceId, mappingId, status, version]);

  useEffect(() => {
    if (!job || !draft || !activeWorkspaceId || !activeJobStatuses.has(job.status)) return;

    let disposed = false;
    const timer = window.setTimeout(() => {
      void mappingDraftService
        .getSuggestion(activeWorkspaceId, draft.draftId, job.jobId)
        .then(nextJob => {
          if (disposed) return;
          setJob(nextJob);
          if (nextJob.status === 'completed') {
            void loadMapping();
          }
        })
        .catch(jobError => {
          if (!disposed) {
            setError(
              jobError instanceof Error
                ? jobError.message
                : 'Não foi possível consultar o job de sugestão.'
            );
          }
        });
    }, 1200);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [activeWorkspaceId, draft, job, loadMapping]);

  const handleRuleUpdate = async (rule: MappingDraftRule, update: RuleUpdate) => {
    if (!activeWorkspaceId || !draft || !explanation?.capabilities.author) {
      throw new Error('A autoria não está disponível para este mapping.');
    }

    setBusyRuleId(rule.ruleId);
    try {
      const updated = await mappingDraftService.updateRule({
        workspaceId: activeWorkspaceId,
        draftId: draft.draftId,
        ruleId: rule.ruleId,
        eTag: rule.eTag,
        ...update,
      });
      setDraft(current =>
        current
          ? {
              ...current,
              rules: current.rules.map(item => (item.ruleId === updated.ruleId ? updated : item)),
            }
          : current
      );
      const refreshedExplanation = await workspaceService.getMappingExplanation(
        activeWorkspaceId,
        mappingId,
        version
      );
      setExplanation(refreshedExplanation);
    } catch (updateError) {
      if (updateError instanceof MappingDraftRequestError && updateError.currentRule) {
        const currentRule = updateError.currentRule;
        setDraft(current =>
          current
            ? {
                ...current,
                rules: current.rules.map(item =>
                  item.ruleId === currentRule.ruleId ? currentRule : item
                ),
              }
            : current
        );
      }
      throw updateError;
    } finally {
      setBusyRuleId(null);
    }
  };

  const startSuggestion = async () => {
    if (!activeWorkspaceId || !draft) return;
    setError(null);
    try {
      setJob(await mappingDraftService.createSuggestion(activeWorkspaceId, draft.draftId));
    } catch (suggestionError) {
      setError(
        suggestionError instanceof Error
          ? suggestionError.message
          : 'Não foi possível iniciar as sugestões.'
      );
    }
  };

  const cancelSuggestion = async () => {
    if (!activeWorkspaceId || !draft || !job) return;
    try {
      await mappingDraftService.cancelSuggestion(activeWorkspaceId, draft.draftId, job.jobId);
      setJob({ ...job, status: 'canceled' });
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : 'Não foi possível cancelar o job.'
      );
    }
  };

  if (status === 'idle' || status === 'loading' || loading) {
    return (
      <main
        className="mapping-studio-page mapping-studio-page--state"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="mapping-loader" aria-hidden="true" />
        <h1>Abrindo o Mapping Studio…</h1>
      </main>
    );
  }

  if (error && !explanation) {
    return (
      <main className="mapping-studio-page mapping-studio-page--state">
        <section role="alert">
          <p className="mapping-kicker">Mapping indisponível</p>
          <h1>Não foi possível abrir esta transformação</h1>
          <p>{error}</p>
          <div className="mapping-rule-actions">
            <button
              type="button"
              className="mapping-button mapping-button--primary"
              onClick={() => void loadMapping()}
            >
              Tentar novamente
            </button>
            <Link to="/workspace/mapping-studio">Abrir outro mapping</Link>
          </div>
        </section>
      </main>
    );
  }

  if (!explanation) return null;

  const readOnly = explanation.engine === 'sysmiddle' || !explanation.capabilities.author;
  const effectiveCapabilities =
    explanation.engine === 'sysmiddle'
      ? {
          ...explanation.capabilities,
          author: false,
          compile: false,
          publish: false,
        }
      : explanation.capabilities;
  const activeJob = job && activeJobStatuses.has(job.status);

  return (
    <main className="mapping-studio-page">
      <nav className="mapping-breadcrumb" aria-label="Navegação do Mapping Studio">
        <Link to="/workspace">Workspace</Link>
        <span aria-hidden="true">/</span>
        <Link to="/workspace/mapping-studio">Mapping Studio</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{mappingId}</span>
      </nav>

      <header className="mapping-studio-hero">
        <div>
          <p className="mapping-kicker">
            {explanation.engine.toUpperCase()} · {explanation.version}
          </p>
          <h1>{explanation.description || 'Explicação da transformação'}</h1>
          <p className="mapping-id-copy">Mapping {explanation.mappingId}</p>
        </div>
        <span className={`mapping-mode-badge ${readOnly ? 'mapping-mode-badge--readonly' : ''}`}>
          {readOnly ? 'Somente leitura' : 'Revisão humana habilitada'}
        </span>
      </header>

      {explanation.engine === 'sysmiddle' && (
        <aside className="mapping-boundary-notice" role="note">
          <strong>Sysmiddle é explicativo por construção.</strong>
          <span>
            Esta tela não cria, altera, corrige, compila nem publica regras Sysmiddle. Os controles
            de autoria não são renderizados, inclusive por acesso direto à URL.
          </span>
        </aside>
      )}

      {error && (
        <p className="mapping-page-error" role="alert">
          {error}
        </p>
      )}

      <section className="mapping-capability-grid" aria-label="Capacidades deste motor">
        {capabilityLabels.map(([capability, label]) => (
          <article key={capability} data-enabled={effectiveCapabilities[capability]}>
            <span aria-hidden="true">{effectiveCapabilities[capability] ? '✓' : '—'}</span>
            <div>
              <strong>{label}</strong>
              <small>{effectiveCapabilities[capability] ? 'Disponível' : 'Indisponível'}</small>
            </div>
          </article>
        ))}
      </section>

      {(explanation.sourceSchema || explanation.targetSchema) && (
        <section className="mapping-schema-flow" aria-label="Fluxo de schemas">
          <article>
            <span>Origem</span>
            <strong>{explanation.sourceSchema?.description || 'Schema de origem'}</strong>
            <code>{explanation.sourceSchema?.layoutGuid || 'GUID não informado'}</code>
          </article>
          <span className="mapping-schema-flow__arrow" aria-hidden="true">
            →
          </span>
          <article>
            <span>Destino</span>
            <strong>{explanation.targetSchema?.description || 'Schema de destino'}</strong>
            <code>{explanation.targetSchema?.layoutGuid || 'GUID não informado'}</code>
          </article>
        </section>
      )}

      {explanation.limitations.length > 0 && (
        <aside className="mapping-limitations">
          <strong>Limites conhecidos desta explicação</strong>
          <ul>
            {explanation.limitations.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      )}

      {draft && effectiveCapabilities.author && (
        <section className="mapping-studio-section" aria-labelledby="mapping-review-title">
          <div className="mapping-section-heading">
            <div>
              <p className="mapping-kicker">Humano no controle</p>
              <h2 id="mapping-review-title">Revisão das propostas</h2>
              <p>
                Cada decisão usa ETag/If-Match. Uma alteração concorrente é recarregada em vez de
                sobrescrita.
              </p>
            </div>
            <div className="mapping-suggestion-actions">
              <button
                type="button"
                className="mapping-button mapping-button--primary"
                disabled={Boolean(activeJob)}
                onClick={() => void startSuggestion()}
              >
                {activeJob ? 'IA analisando…' : 'Gerar sugestões'}
              </button>
              {activeJob && (
                <button
                  type="button"
                  className="mapping-button"
                  onClick={() => void cancelSuggestion()}
                >
                  Cancelar job
                </button>
              )}
            </div>
          </div>

          {job && (
            <p className="mapping-job-status" role="status">
              Job {job.jobId}: <strong>{job.status}</strong>
              {job.rulesCreated !== undefined ? ` · ${job.rulesCreated} regra(s) criada(s)` : ''}
              {job.error ? ` · ${job.error}` : ''}
            </p>
          )}

          {draft.rules.length === 0 ? (
            <div className="mapping-empty-state">
              <h3>Nenhuma proposta ainda</h3>
              <p>Inicie o job de sugestões para analisar as evidências da revisão vinculada.</p>
            </div>
          ) : (
            <div className="mapping-review-list">
              {draft.rules.map(rule => (
                <MappingRuleReviewCard
                  key={rule.ruleId}
                  rule={rule}
                  busy={busyRuleId === rule.ruleId}
                  onUpdate={handleRuleUpdate}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {draft && effectiveCapabilities.author && activeWorkspaceId && activeWorkspaceRole && (
        <MappingTestLabPanel
          workspaceId={activeWorkspaceId}
          draft={draft}
          compileEnabled={effectiveCapabilities.compile}
          executeEnabled={effectiveCapabilities.execute}
          workspaceRole={activeWorkspaceRole}
        />
      )}

      <section className="mapping-studio-section" aria-labelledby="mapping-explanation-title">
        <div className="mapping-section-heading">
          <div>
            <p className="mapping-kicker">Contrato canônico</p>
            <h2 id="mapping-explanation-title">O que esta transformação faz</h2>
            <p>
              {explanation.opaqueRuleCount} regra(s) opaca(s). O front preserva o nível de suporte
              informado pela API.
            </p>
          </div>
        </div>

        {explanation.rules.length === 0 ? (
          <div className="mapping-empty-state">
            <h3>Nenhuma regra explicável nesta versão</h3>
            <p>Consulte os limites acima; o front não tenta reconstruir regras ausentes.</p>
          </div>
        ) : (
          <div className="mapping-explanation-list">
            {explanation.rules.map(rule => (
              <ExplanationRuleCard key={rule.ruleId} rule={rule} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

const MappingStudioPage = () => {
  const { mappingId, version } = useParams();
  if (!mappingId || !version) {
    return <MappingStudioEntry />;
  }
  return (
    <MappingStudioDetail key={`${mappingId}:${version}`} mappingId={mappingId} version={version} />
  );
};

export default MappingStudioPage;
