import { useEffect, useState } from 'react';
import { testSuiteService } from '../../services/api/testSuiteService';
import type { TestFixture, TestSuite, TestSuiteRun } from '../../types/testSuite';

interface MappingTestSuitePanelProps {
  workspaceId: string;
  draftId: string;
  releaseId: string;
}

/**
 * Test Lab por suíte versionada (LayoutParserApi#423): agrupa várias fixtures fiscais numa
 * suíte reutilizável e executa todas de uma vez contra uma release. Complementa o formulário de
 * fixture única já existente em `MappingTestLabPanel` — aqui a execução (`run`) é SÍNCRONA, sem
 * job/polling: a API devolve o resultado completo (`fixtureResults`) na própria resposta.
 */
const MappingTestSuitePanel = ({ workspaceId, draftId, releaseId }: MappingTestSuitePanelProps) => {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<TestFixture[]>([]);
  const [runs, setRuns] = useState<TestSuiteRun[]>([]);
  const [lastRun, setLastRun] = useState<TestSuiteRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Ao trocar (ou limpar) a suíte selecionada, os dados da suíte anterior ficam obsoletos.
  // Ajuste feito durante o render (não em useEffect) para evitar cascata de re-render
  // (react-hooks/set-state-in-effect).
  const [loadedSuiteId, setLoadedSuiteId] = useState<string | null>(null);
  if (loadedSuiteId !== selectedSuiteId) {
    setLoadedSuiteId(selectedSuiteId);
    setFixtures([]);
    setRuns([]);
    setLastRun(null);
  }

  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDescription, setNewSuiteDescription] = useState('');
  const [fixtureName, setFixtureName] = useState('');
  const [fixtureInputXml, setFixtureInputXml] = useState('');
  const [fixtureExpectedXml, setFixtureExpectedXml] = useState('');
  const [fixtureXsdVersion, setFixtureXsdVersion] = useState('');

  useEffect(() => {
    let disposed = false;
    void testSuiteService
      .listSuites(workspaceId, draftId)
      .then(items => {
        if (!disposed) setSuites(items);
      })
      .catch(loadError => {
        if (!disposed) {
          setError(
            loadError instanceof Error ? loadError.message : 'Não foi possível listar as suítes.'
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [workspaceId, draftId]);

  useEffect(() => {
    if (!selectedSuiteId) {
      return;
    }
    let disposed = false;
    void testSuiteService
      .listFixtures(workspaceId, draftId, selectedSuiteId)
      .then(items => {
        if (!disposed) setFixtures(items);
      })
      .catch(loadError => {
        if (!disposed) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível listar as fixtures da suíte.'
          );
        }
      });
    void testSuiteService
      .listRuns(workspaceId, draftId, selectedSuiteId)
      .then(response => {
        if (!disposed) setRuns(response.items);
      })
      .catch(loadError => {
        if (!disposed) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Não foi possível listar o histórico de execuções.'
          );
        }
      });
    return () => {
      disposed = true;
    };
  }, [workspaceId, draftId, selectedSuiteId]);

  const createSuite = async () => {
    setError(null);
    try {
      const suite = await testSuiteService.createSuite({
        workspaceId,
        draftId,
        name: newSuiteName,
        description: newSuiteDescription.trim() ? newSuiteDescription : null,
      });
      setSuites(current => [...current, suite]);
      setSelectedSuiteId(suite.suiteId);
      setNewSuiteName('');
      setNewSuiteDescription('');
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Não foi possível criar a suíte.'
      );
    }
  };

  const addFixture = async () => {
    if (!selectedSuiteId) return;
    setError(null);
    try {
      const fixture = await testSuiteService.createFixture({
        workspaceId,
        draftId,
        suiteId: selectedSuiteId,
        name: fixtureName,
        inputXml: fixtureInputXml,
        expectedXml: fixtureExpectedXml,
        xsdVersion: fixtureXsdVersion.trim() ? fixtureXsdVersion : null,
      });
      setFixtures(current => [...current, fixture]);
      setFixtureName('');
      setFixtureInputXml('');
      setFixtureExpectedXml('');
      setFixtureXsdVersion('');
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : 'Não foi possível adicionar a fixture.'
      );
    }
  };

  const runSuite = async () => {
    if (!selectedSuiteId) return;
    setError(null);
    setRunning(true);
    try {
      const run = await testSuiteService.runSuite(workspaceId, draftId, selectedSuiteId, releaseId);
      setLastRun(run);
      setRuns(current => [run, ...current]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Não foi possível executar a suíte.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="mapping-studio-section" aria-labelledby="mapping-test-suite-title">
      <div className="mapping-section-heading">
        <div>
          <h3 id="mapping-test-suite-title">Suíte de testes versionada</h3>
          <p>
            Agrupe fixtures fiscais numa suíte reutilizável e execute todas em lote contra esta
            release. A execução é síncrona: o resultado completo chega na mesma resposta.
          </p>
        </div>
      </div>

      {error && (
        <p className="mapping-page-error" role="alert">
          {error}
        </p>
      )}

      <form
        className="mapping-test-form"
        onSubmit={event => {
          event.preventDefault();
          void createSuite();
        }}
      >
        <h4>Nova suíte</h4>
        <label>
          Nome
          <input
            value={newSuiteName}
            onChange={event => setNewSuiteName(event.target.value)}
            required
          />
        </label>
        <label>
          Descrição (opcional)
          <input
            value={newSuiteDescription}
            onChange={event => setNewSuiteDescription(event.target.value)}
          />
        </label>
        <button type="submit" className="mapping-button">
          Criar suíte
        </button>
      </form>

      {suites.length > 0 && (
        <label>
          Suíte selecionada
          <select
            value={selectedSuiteId ?? ''}
            onChange={event => setSelectedSuiteId(event.target.value || null)}
          >
            <option value="">Selecione uma suíte</option>
            {suites.map(suite => (
              <option key={suite.suiteId} value={suite.suiteId}>
                {suite.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedSuiteId && (
        <>
          <form
            className="mapping-test-form"
            onSubmit={event => {
              event.preventDefault();
              void addFixture();
            }}
          >
            <h4>Adicionar fixture</h4>
            <label>
              Nome
              <input
                value={fixtureName}
                onChange={event => setFixtureName(event.target.value)}
                required
              />
            </label>
            <label>
              XML de entrada
              <textarea
                value={fixtureInputXml}
                onChange={event => setFixtureInputXml(event.target.value)}
                rows={6}
                required
              />
            </label>
            <label>
              XML esperado
              <textarea
                value={fixtureExpectedXml}
                onChange={event => setFixtureExpectedXml(event.target.value)}
                rows={6}
                required
              />
            </label>
            <label>
              Versão do XSD (opcional)
              <input
                value={fixtureXsdVersion}
                onChange={event => setFixtureXsdVersion(event.target.value)}
              />
            </label>
            <button type="submit" className="mapping-button">
              Adicionar fixture
            </button>
          </form>

          <p className="mapping-job-status" role="status">
            {fixtures.length} fixture(s) nesta suíte.
          </p>

          <button
            type="button"
            className="mapping-button mapping-button--primary"
            disabled={fixtures.length === 0 || running}
            onClick={() => void runSuite()}
          >
            {running ? 'Executando suíte…' : 'Executar suíte nesta release'}
          </button>

          {lastRun && (
            <div
              className="mapping-test-summary"
              data-passed={lastRun.requiredGatesPassed}
              role="status"
              aria-live="polite"
            >
              <header>
                <h4>
                  {lastRun.requiredGatesPassed
                    ? 'Todas as fixtures da suíte passaram'
                    : 'A suíte tem fixtures reprovadas'}
                </h4>
                <strong>
                  {lastRun.passed}/{lastRun.totalFixtures} aprovadas
                </strong>
              </header>
              <p>
                Execução {lastRun.runId} ·{' '}
                {lastRun.durationMs !== null ? `${lastRun.durationMs} ms` : 'duração não informada'}
              </p>
              <ul>
                {lastRun.fixtureResults.map(result => (
                  <li key={result.fixtureId}>
                    {result.fixtureName}: {result.passed ? 'aprovada' : 'reprovada'}
                    {result.durationMs !== null ? ` · ${result.durationMs} ms` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {runs.length > 0 && (
            <details className="mapping-technical-details">
              <summary>Histórico de execuções ({runs.length})</summary>
              <ul>
                {runs.map(run => (
                  <li key={run.runId}>
                    {run.executedAt} · release {run.releaseId} · {run.passed}/{run.totalFixtures}{' '}
                    aprovadas · {run.requiredGatesPassed ? 'gates aprovados' : 'gates reprovados'}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
};

export default MappingTestSuitePanel;
