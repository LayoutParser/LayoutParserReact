import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { testSuiteService } from '../../services/api/testSuiteService';
import type { TestFixture, TestSuite, TestSuiteRun } from '../../types/testSuite';
import MappingTestSuitePanel from './MappingTestSuitePanel';

vi.mock('../../services/api/testSuiteService', () => ({
  testSuiteService: {
    createSuite: vi.fn(),
    listSuites: vi.fn(),
    getSuite: vi.fn(),
    createFixture: vi.fn(),
    listFixtures: vi.fn(),
    runSuite: vi.fn(),
    listRuns: vi.fn(),
  },
}));

const suite: TestSuite = {
  suiteId: 'suite-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  name: 'Suíte NFe padrão',
  description: null,
  createdByUserId: 'user-1',
  createdAt: '2026-09-20T10:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

const fixture: TestFixture = {
  fixtureId: 'fixture-1',
  suiteId: 'suite-1',
  name: 'Caso feliz',
  inputXml: '<in/>',
  expectedXml: '<out/>',
  xsdVersion: null,
  sortOrder: 0,
  createdAt: '2026-09-20T10:05:00Z',
};

const run: TestSuiteRun = {
  runId: 'run-1',
  suiteId: 'suite-1',
  releaseId: 'release-1',
  executedByUserId: 'user-1',
  executedAt: '2026-09-21T10:00:00Z',
  totalFixtures: 1,
  passed: 1,
  failed: 0,
  requiredGatesPassed: true,
  durationMs: 120,
  fixtureResults: [
    { fixtureId: 'fixture-1', fixtureName: 'Caso feliz', passed: true, durationMs: 100, raw: {} },
  ],
};

describe('MappingTestSuitePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(testSuiteService.listSuites).mockResolvedValue([]);
    vi.mocked(testSuiteService.listFixtures).mockResolvedValue([]);
    vi.mocked(testSuiteService.listRuns).mockResolvedValue({ items: [], totalCount: 0 });
  });

  it('cria uma suíte e a seleciona automaticamente', async () => {
    vi.mocked(testSuiteService.createSuite).mockResolvedValue(suite);
    render(
      <MappingTestSuitePanel workspaceId="workspace-1" draftId="draft-1" releaseId="release-1" />
    );

    await waitFor(() => expect(testSuiteService.listSuites).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Suíte NFe padrão' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar suíte' }));

    await waitFor(() => expect(testSuiteService.createSuite).toHaveBeenCalled());
    await waitFor(() =>
      expect(testSuiteService.listFixtures).toHaveBeenCalledWith(
        'workspace-1',
        'draft-1',
        'suite-1'
      )
    );
  });

  it('adiciona fixture e executa a suíte de forma síncrona', async () => {
    vi.mocked(testSuiteService.listSuites).mockResolvedValue([suite]);
    vi.mocked(testSuiteService.createFixture).mockResolvedValue(fixture);
    vi.mocked(testSuiteService.runSuite).mockResolvedValue(run);

    render(
      <MappingTestSuitePanel workspaceId="workspace-1" draftId="draft-1" releaseId="release-1" />
    );

    await waitFor(() => expect(testSuiteService.listSuites).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Suíte selecionada'), {
      target: { value: 'suite-1' },
    });

    await waitFor(() => expect(testSuiteService.listFixtures).toHaveBeenCalled());

    const nameInputs = screen.getAllByLabelText('Nome');
    fireEvent.change(nameInputs[nameInputs.length - 1], {
      target: { value: 'Caso feliz' },
    });
    fireEvent.change(screen.getByLabelText('XML de entrada'), { target: { value: '<in/>' } });
    fireEvent.change(screen.getByLabelText('XML esperado'), { target: { value: '<out/>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar fixture' }));

    await waitFor(() => expect(testSuiteService.createFixture).toHaveBeenCalled());

    const runButton = await screen.findByRole('button', { name: 'Executar suíte nesta release' });
    fireEvent.click(runButton);

    await waitFor(() =>
      expect(testSuiteService.runSuite).toHaveBeenCalledWith(
        'workspace-1',
        'draft-1',
        'suite-1',
        'release-1'
      )
    );

    expect(await screen.findByText('Todas as fixtures da suíte passaram')).toBeInTheDocument();
  });
});
