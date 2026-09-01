import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mappingReleaseService } from '../../services/api/mappingReleaseService';
import type { MappingDraft } from '../../types/mappingDraft';
import type {
  MappingCompileJob,
  MappingRelease,
  MappingReleaseArtifact,
  MappingTestRunJob,
} from '../../types/mappingRelease';

interface MappingTestLabPanelProps {
  workspaceId: string;
  draft: MappingDraft;
  compileEnabled: boolean;
  executeEnabled: boolean;
}

const activeStatuses = new Set(['queued', 'running']);

const releaseStatusLabels: Record<MappingRelease['status'], string> = {
  draft_compiled: 'Compilada, aguardando testes',
  test_passed: 'Gates aprovados',
  test_failed: 'Gates reprovados',
};

const downloadArtifact = (artifact: MappingReleaseArtifact, releaseId: string) => {
  const extension = artifact.kind.toLowerCase() === 'tcl' ? 'tcl' : 'xslt';
  const blob = new Blob([artifact.content], {
    type: extension === 'xslt' ? 'application/xml;charset=utf-8' : 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mapping-${releaseId}.${extension}`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const MappingTestLabPanel = ({
  workspaceId,
  draft,
  compileEnabled,
  executeEnabled,
}: MappingTestLabPanelProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const releaseIdFromUrl = searchParams.get('releaseId');
  const [compileJob, setCompileJob] = useState<MappingCompileJob | null>(null);
  const [testJob, setTestJob] = useState<MappingTestRunJob | null>(null);
  const [releaseResult, setReleaseResult] = useState<{
    releaseId: string;
    value: MappingRelease;
  } | null>(null);
  const [inputXml, setInputXml] = useState('');
  const [expectedXml, setExpectedXml] = useState('');
  const [xsdVersion, setXsdVersion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const release = releaseResult?.releaseId === releaseIdFromUrl ? releaseResult.value : null;

  const acceptedRules = draft.rules.filter(rule =>
    ['accepted', 'edited'].includes(rule.status)
  ).length;

  useEffect(() => {
    if (!releaseIdFromUrl) return;

    let disposed = false;
    void mappingReleaseService
      .getRelease(workspaceId, draft.draftId, releaseIdFromUrl)
      .then(nextRelease => {
        if (!disposed) {
          setReleaseResult({ releaseId: nextRelease.releaseId, value: nextRelease });
        }
      })
      .catch(loadError => {
        if (!disposed) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível carregar a release compilada.'
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [draft.draftId, releaseIdFromUrl, workspaceId]);

  useEffect(() => {
    if (!compileJob || !activeStatuses.has(compileJob.status)) return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      void mappingReleaseService
        .getCompileJob(workspaceId, draft.draftId, compileJob.jobId)
        .then(async nextJob => {
          if (disposed) return;
          if (nextJob.status === 'completed' && nextJob.releaseId) {
            const nextRelease = await mappingReleaseService.getRelease(
              workspaceId,
              draft.draftId,
              nextJob.releaseId
            );
            if (disposed) return;
            setReleaseResult({ releaseId: nextRelease.releaseId, value: nextRelease });
            const nextSearch = new URLSearchParams(searchParams);
            nextSearch.set('releaseId', nextJob.releaseId);
            setSearchParams(nextSearch, { replace: true });
          }
          setCompileJob(nextJob);
        })
        .catch(jobError => {
          if (!disposed) {
            setError(
              jobError instanceof Error
                ? jobError.message
                : 'Não foi possível observar a compilação.'
            );
          }
        });
    }, 1200);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [compileJob, draft.draftId, searchParams, setSearchParams, workspaceId]);

  useEffect(() => {
    if (!testJob || !activeStatuses.has(testJob.status)) return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      void mappingReleaseService
        .getTestRunJob(workspaceId, draft.draftId, testJob.jobId)
        .then(async nextJob => {
          if (disposed) return;
          if (nextJob.status === 'completed' && nextJob.releaseId) {
            const nextRelease = await mappingReleaseService.getRelease(
              workspaceId,
              draft.draftId,
              nextJob.releaseId
            );
            if (!disposed) {
              setReleaseResult({ releaseId: nextRelease.releaseId, value: nextRelease });
            }
          }
          if (!disposed) setTestJob(nextJob);
        })
        .catch(jobError => {
          if (!disposed) {
            setError(
              jobError instanceof Error
                ? jobError.message
                : 'Não foi possível observar o Fiscal Test Lab.'
            );
          }
        });
    }, 1200);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [draft.draftId, testJob, workspaceId]);

  const startCompile = async () => {
    setError(null);
    try {
      setCompileJob(await mappingReleaseService.compileDraft(workspaceId, draft.draftId));
    } catch (compileError) {
      setError(
        compileError instanceof Error ? compileError.message : 'Não foi possível compilar o draft.'
      );
    }
  };

  const startTestRun = async () => {
    if (!release) return;
    setError(null);
    try {
      const nextJob = await mappingReleaseService.createTestRun({
        workspaceId,
        draftId: draft.draftId,
        releaseId: release.releaseId,
        inputXml,
        expectedXml,
        ...(xsdVersion.trim() ? { xsdVersion: xsdVersion.trim() } : {}),
      });
      setTestJob(nextJob);
      // As fixtures fiscais permanecem apenas pelo tempo necessário para o envio.
      setInputXml('');
      setExpectedXml('');
      setXsdVersion('');
    } catch (testError) {
      setError(
        testError instanceof Error ? testError.message : 'Não foi possível iniciar o Test Lab.'
      );
    }
  };

  const compileActive = Boolean(compileJob && activeStatuses.has(compileJob.status));
  const testActive = Boolean(testJob && activeStatuses.has(testJob.status));

  return (
    <section className="mapping-studio-section" aria-labelledby="mapping-test-lab-title">
      <div className="mapping-section-heading">
        <div>
          <p className="mapping-kicker">Slice 5</p>
          <h2 id="mapping-test-lab-title">Compilação e Fiscal Test Lab</h2>
          <p>
            O artefato nasce de um snapshot das regras aceitas/editadas. XML de fixture não é salvo
            no navegador.
          </p>
        </div>
        {compileEnabled && (
          <button
            type="button"
            className="mapping-button mapping-button--primary"
            disabled={acceptedRules === 0 || compileActive}
            onClick={() => void startCompile()}
          >
            {compileActive ? 'Compilando…' : 'Compilar snapshot'}
          </button>
        )}
      </div>

      {!compileEnabled && (
        <aside className="mapping-boundary-notice" role="note">
          <strong>A API ainda informa compile=false para este motor.</strong>
          <span>
            O front mantém o controle bloqueado até o contrato de capabilities refletir o endpoint
            do Slice 5. O ajuste está registrado no PR #243 da API.
          </span>
        </aside>
      )}

      {compileEnabled && acceptedRules === 0 && (
        <aside className="mapping-limitations" role="note">
          Aceite ou corrija ao menos uma regra antes de compilar. Propostas e ambiguidades não
          entram no artefato oficial.
        </aside>
      )}

      {error && (
        <p className="mapping-page-error" role="alert">
          {error}
        </p>
      )}

      {compileJob && (
        <p className="mapping-job-status" role="status">
          Compilação {compileJob.jobId}: <strong>{compileJob.status}</strong>
          {compileJob.durationMs !== null ? ` · ${compileJob.durationMs} ms` : ''}
          {compileJob.error ? ` · ${compileJob.error}` : ''}
        </p>
      )}

      {release && (
        <div className="mapping-release-panel">
          <header>
            <div>
              <span className="mapping-rule-id">Release {release.releaseId}</span>
              <h3>{releaseStatusLabels[release.status]}</h3>
            </div>
            <span className="mapping-status-badge">{release.engine.toUpperCase()}</span>
          </header>

          <dl className="mapping-rule-facts">
            <div>
              <dt>Snapshot</dt>
              <dd>{release.rulesSnapshotHash}</dd>
            </div>
            <div>
              <dt>Correlation ID</dt>
              <dd>{release.correlationId}</dd>
            </div>
            <div>
              <dt>Regras fonte</dt>
              <dd>{release.sourceRuleIds.length}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{releaseStatusLabels[release.status]}</dd>
            </div>
          </dl>

          {release.compileDiagnostics.length > 0 && (
            <aside className="mapping-limitations">
              <strong>Diagnósticos de compilação</strong>
              <ul>
                {release.compileDiagnostics.map(diagnostic => (
                  <li key={`${diagnostic.ruleId}-${diagnostic.message}`}>
                    {diagnostic.severity}: regra {diagnostic.ruleId} — {diagnostic.message}
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <div className="mapping-artifact-list">
            {release.artifacts.map(artifact => (
              <article key={`${artifact.kind}-${artifact.hash}`}>
                <header>
                  <div>
                    <strong>{artifact.kind.toUpperCase()}</strong>
                    <small>Hash {artifact.hash}</small>
                  </div>
                  <button
                    type="button"
                    className="mapping-button"
                    onClick={() => downloadArtifact(artifact, release.releaseId)}
                  >
                    Baixar artefato
                  </button>
                </header>
                <details>
                  <summary>Visualizar código gerado</summary>
                  <pre>
                    <code>{artifact.content}</code>
                  </pre>
                </details>
              </article>
            ))}
          </div>

          {release.engine === 'tcl' && (
            <aside className="mapping-limitations" role="note">
              O Slice 5 compila TCL, mas a API ainda não possui runner determinístico para
              executá-lo. A release pode ser inspecionada, porém o gate de Test Lab não pode ser
              aprovado.
            </aside>
          )}

          {release.engine === 'xslt' && executeEnabled && (
            <form
              className="mapping-test-form"
              onSubmit={event => {
                event.preventDefault();
                void startTestRun();
              }}
            >
              <h3>Executar fixture individual</h3>
              <p>
                A API aplica o XSLT, valida o XSD quando reconhecido e compara o XML canônico com o
                gabarito.
              </p>
              <label>
                XML de entrada
                <textarea
                  value={inputXml}
                  onChange={event => setInputXml(event.target.value)}
                  rows={8}
                  required
                />
              </label>
              <label>
                XML esperado
                <textarea
                  value={expectedXml}
                  onChange={event => setExpectedXml(event.target.value)}
                  rows={8}
                  required
                />
              </label>
              <label>
                Versão do XSD (opcional)
                <input value={xsdVersion} onChange={event => setXsdVersion(event.target.value)} />
              </label>
              <button
                type="submit"
                className="mapping-button mapping-button--primary"
                disabled={testActive}
              >
                {testActive ? 'Executando gates…' : 'Executar Test Lab'}
              </button>
            </form>
          )}

          {testJob && (
            <p className="mapping-job-status" role="status">
              Test Lab {testJob.jobId}: <strong>{testJob.status}</strong>
              {testJob.requiredGatesPassed !== null
                ? ` · gates ${testJob.requiredGatesPassed ? 'aprovados' : 'reprovados'}`
                : ''}
              {testJob.durationMs !== null ? ` · ${testJob.durationMs} ms` : ''}
              {testJob.error ? ` · ${testJob.error}` : ''}
            </p>
          )}

          {release.testRunSummary && (
            <div
              className="mapping-test-summary"
              data-passed={release.testRunSummary.requiredGatesPassed}
            >
              <header>
                <h3>
                  {release.testRunSummary.requiredGatesPassed
                    ? 'Todos os gates obrigatórios passaram'
                    : 'A release ainda não pode avançar'}
                </h3>
                <strong>{release.testRunSummary.coveragePercent.toFixed(1)}% de cobertura</strong>
              </header>
              <p>
                {release.testRunSummary.passed} verificação(ões) aprovada(s) ·{' '}
                {release.testRunSummary.failed} reprovada(s) · XSD{' '}
                {release.testRunSummary.xsdValid ? 'válido' : 'inválido'}
              </p>
              {release.testRunSummary.xsdErrors.length > 0 && (
                <ul>
                  {release.testRunSummary.xsdErrors.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {release.testRunSummary.divergences.map((divergence, index) => (
                <article key={`${divergence.xpath}-${divergence.kind}-${index}`}>
                  <strong>
                    {divergence.kind} em {divergence.xpath}
                  </strong>
                  <p>
                    Esperado: <code>{divergence.expected ?? 'ausente'}</code>
                  </p>
                  <p>
                    Atual: <code>{divergence.actual ?? 'ausente'}</code>
                  </p>
                  <p>
                    Regra: {divergence.ruleId ?? 'não resolvida'} · Origem:{' '}
                    {divergence.sourceRefs?.join(', ') || 'não resolvida'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default MappingTestLabPanel;
