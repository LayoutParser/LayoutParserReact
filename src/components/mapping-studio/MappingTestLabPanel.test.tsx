import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mappingReleaseService } from '../../services/api/mappingReleaseService';
import type { MappingDraft } from '../../types/mappingDraft';
import MappingTestLabPanel from './MappingTestLabPanel';

vi.mock('../../services/api/mappingReleaseService', () => ({
  mappingReleaseService: {
    compileDraft: vi.fn(),
    getCompileJob: vi.fn(),
    getRelease: vi.fn(),
    createTestRun: vi.fn(),
    getTestRunJob: vi.fn(),
  },
}));

const draft: MappingDraft = {
  draftId: 'draft-1',
  workspaceId: 'workspace-1',
  packageId: 'package-1',
  revisionId: 'revision-1',
  engine: 'xslt',
  createdAt: '2026-08-31T19:00:00Z',
  rules: [
    {
      ruleId: 'rule-1',
      draftId: 'draft-1',
      sourceRefs: ['layout://CNPJ'],
      targetRefs: ['xsd:///emit/CNPJ'],
      operation: 'copy',
      conditions: '[]',
      transformations: '[]',
      cardinality: '1:1',
      evidence: [],
      confidence: 'high',
      status: 'accepted',
      questions: [],
      createdAt: '2026-08-31T19:00:00Z',
      eTag: 'AAAAAAAAAAE=',
    },
  ],
};

const release = {
  releaseId: 'release-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  engine: 'xslt' as const,
  artifacts: [
    {
      kind: 'xslt',
      content: '<xsl:stylesheet version="1.0"/>',
      hash: 'artifact-hash',
      generatedAt: '2026-08-31T22:00:00Z',
    },
  ],
  sourceRuleIds: ['rule-1'],
  compileDiagnostics: [],
  rulesSnapshotHash: 'snapshot-hash',
  testRunSummary: null,
  status: 'draft_compiled' as const,
  correlationId: 'correlation-1',
  createdAt: '2026-08-31T22:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

function renderPanel(path = '/workspace/mapping-studio/draft-1/draft') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MappingTestLabPanel workspaceId="workspace-1" draft={draft} compileEnabled executeEnabled />
    </MemoryRouter>
  );
}

describe('MappingTestLabPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('respeita capability compile=false e não chama o endpoint', () => {
    render(
      <MemoryRouter>
        <MappingTestLabPanel
          workspaceId="workspace-1"
          draft={draft}
          compileEnabled={false}
          executeEnabled
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/API ainda informa compile=false/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Compilar snapshot' })).not.toBeInTheDocument();
    expect(mappingReleaseService.compileDraft).not.toHaveBeenCalled();
  });

  it('inicia compilação somente do snapshot revisado', async () => {
    vi.mocked(mappingReleaseService.compileDraft).mockResolvedValue({
      jobId: 'compile-job-1',
      status: 'queued',
      releaseId: null,
      error: null,
      durationMs: null,
    });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Compilar snapshot' }));

    await waitFor(() =>
      expect(mappingReleaseService.compileDraft).toHaveBeenCalledWith('workspace-1', 'draft-1')
    );
    expect(screen.getByText(/Compilação compile-job-1/i)).toBeVisible();
  });

  it('reabre a release pela URL e limpa a fixture depois de enfileirar o teste', async () => {
    vi.mocked(mappingReleaseService.getRelease).mockResolvedValue(release);
    vi.mocked(mappingReleaseService.createTestRun).mockResolvedValue({
      jobId: 'test-job-1',
      status: 'queued',
      releaseId: 'release-1',
      requiredGatesPassed: null,
      error: null,
      durationMs: null,
    });
    renderPanel('/workspace/mapping-studio/draft-1/draft?releaseId=release-1');

    expect(
      await screen.findByRole('heading', { name: 'Compilada, aguardando testes' })
    ).toBeVisible();
    const input = screen.getByLabelText('XML de entrada');
    const expected = screen.getByLabelText('XML esperado');
    fireEvent.change(input, { target: { value: '<source />' } });
    fireEvent.change(expected, { target: { value: '<target />' } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar Test Lab' }));

    await waitFor(() =>
      expect(mappingReleaseService.createTestRun).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        releaseId: 'release-1',
        inputXml: '<source />',
        expectedXml: '<target />',
      })
    );
    expect(input).toHaveValue('');
    expect(expected).toHaveValue('');
    expect(window.localStorage).toHaveLength(0);
  });
});
