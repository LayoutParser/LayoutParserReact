import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { mappingReleaseService } from './mappingReleaseService';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const release = {
  releaseId: 'release-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  engine: 'xslt',
  artifacts: [
    {
      kind: 'xslt',
      content: '<xsl:stylesheet version="1.0"/>',
      hash: 'sha256-release',
      generatedAt: '2026-08-31T22:00:00Z',
    },
  ],
  sourceRuleIds: ['rule-1'],
  compileDiagnostics: [],
  rulesSnapshotHash: 'snapshot-hash',
  testRunSummary: null,
  status: 'draft_compiled',
  correlationId: 'correlation-1',
  createdAt: '2026-08-31T22:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

const governanceSnapshot = {
  releaseId: 'release-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  engine: 'xslt',
  status: 'approved',
  environment: 'development',
  approvedByUserId: 'reviewer-1',
  approvedAt: '2026-09-01T10:00:00Z',
  approvalJustification: 'Revisão fiscal concluída.',
  publishedByUserId: null,
  publishedAt: null,
  previousPublishedReleaseId: null,
  correlationId: 'correlation-1',
  eTag: 'AAAAAAAAAAI=',
};

describe('mappingReleaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('inicia e observa a compilação assíncrona', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { jobId: 'compile-job-1', status: 'queued' },
    });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        jobId: 'compile-job-1',
        status: 'completed',
        releaseId: 'release-1',
        error: null,
        durationMs: 42,
      },
    });

    await expect(mappingReleaseService.compileDraft('workspace-1', 'draft-1')).resolves.toEqual({
      jobId: 'compile-job-1',
      status: 'queued',
      releaseId: null,
      error: null,
      durationMs: null,
    });
    await expect(
      mappingReleaseService.getCompileJob('workspace-1', 'draft-1', 'compile-job-1')
    ).resolves.toMatchObject({ status: 'completed', releaseId: 'release-1' });
  });

  it('consulta release e valida o snapshot compilado', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: release });

    await expect(
      mappingReleaseService.getRelease('workspace-1', 'draft-1', 'release-1')
    ).resolves.toEqual({
      ...release,
      environment: null,
      approvedByUserId: null,
      approvedAt: null,
      approvalJustification: null,
      publishedByUserId: null,
      publishedAt: null,
      previousPublishedReleaseId: null,
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-drafts/draft-1/releases/release-1'
    );
  });

  it('envia a fixture ad-hoc sem persistir ou transformar o XML no front', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { jobId: 'test-job-1', status: 'queued' },
    });
    const inputXml = '<source><CNPJ>123</CNPJ></source>';
    const expectedXml = '<NFe><emit><CNPJ>123</CNPJ></emit></NFe>';

    await expect(
      mappingReleaseService.createTestRun({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        releaseId: 'release-1',
        inputXml,
        expectedXml,
        xsdVersion: '4.00',
      })
    ).resolves.toEqual({
      jobId: 'test-job-1',
      status: 'queued',
      releaseId: 'release-1',
      requiredGatesPassed: null,
      error: null,
      durationMs: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-drafts/draft-1/test-runs',
      { releaseId: 'release-1', inputXml, expectedXml, xsdVersion: '4.00' }
    );
    expect(window.localStorage).toHaveLength(0);
  });

  it('observa o resultado dos gates do Test Lab', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        jobId: 'test-job-1',
        status: 'completed',
        releaseId: 'release-1',
        requiredGatesPassed: false,
        error: null,
        durationMs: 91,
      },
    });

    await expect(
      mappingReleaseService.getTestRunJob('workspace-1', 'draft-1', 'test-job-1')
    ).resolves.toMatchObject({ status: 'completed', requiredGatesPassed: false });
  });

  it('recusa release com percentual de cobertura impossível', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        ...release,
        status: 'test_passed',
        testRunSummary: {
          passed: 1,
          failed: 0,
          coveragePercent: 120,
          requiredGatesPassed: true,
          xsdValid: true,
          xsdErrors: [],
          divergences: [],
        },
      },
    });

    await expect(
      mappingReleaseService.getRelease('workspace-1', 'draft-1', 'release-1')
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it.each(['sysmiddle', ' sysmiddle ', ['xslt', 'sysmiddle'], { value: 'xslt' }])(
    'recusa release devolvida com engine adulterado: %o',
    async engine => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { ...release, engine } });

      await expect(
        mappingReleaseService.getRelease('workspace-1', 'draft-1', 'release-1')
      ).rejects.toMatchObject({ kind: 'invalid_response' });
    }
  );

  it('recusa estado test_passed contraditório com gates reprovados', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        ...release,
        status: 'test_passed',
        testRunSummary: {
          passed: 0,
          failed: 1,
          coveragePercent: 50,
          requiredGatesPassed: false,
          xsdValid: false,
          xsdErrors: ['XML inválido.'],
          divergences: [],
        },
      },
    });

    await expect(
      mappingReleaseService.getRelease('workspace-1', 'draft-1', 'release-1')
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('aceita status governado no GET completo sem inventar metadados omitidos pela API', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        ...release,
        status: 'published',
        testRunSummary: {
          passed: 1,
          failed: 0,
          coveragePercent: 100,
          requiredGatesPassed: true,
          xsdValid: true,
          xsdErrors: ['Validação XSD indisponível — não considerada no gate.'],
          divergences: [],
        },
      },
    });

    await expect(
      mappingReleaseService.getRelease('workspace-1', 'draft-1', 'release-1')
    ).resolves.toMatchObject({ status: 'published', environment: null });
  });

  it('aprova somente com justificativa e valida a resposta parcial', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: governanceSnapshot });

    await expect(
      mappingReleaseService.approveRelease(
        'workspace-1',
        'release-1',
        '  Revisão fiscal concluída.  '
      )
    ).resolves.toEqual(governanceSnapshot);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-releases/release-1/approve',
      { justification: 'Revisão fiscal concluída.' }
    );
    await expect(
      mappingReleaseService.approveRelease('workspace-1', 'release-1', '   ')
    ).rejects.toMatchObject({ kind: 'invalid_input' });
  });

  it('publica apenas nos ambientes suportados pela interface', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        ...governanceSnapshot,
        status: 'published',
        environment: 'production',
        publishedByUserId: 'admin-1',
        publishedAt: '2026-09-01T10:05:00Z',
      },
    });

    await expect(
      mappingReleaseService.publishRelease('workspace-1', 'release-1', 'production')
    ).resolves.toMatchObject({ status: 'published', environment: 'production' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-releases/release-1/publish',
      { environment: 'production' }
    );
  });

  it('executa rollback sem corpo e mantém o retorno idempotente autoritativo', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        ...governanceSnapshot,
        status: 'deprecated',
        environment: 'production',
        publishedByUserId: 'admin-1',
        publishedAt: '2026-09-01T10:05:00Z',
        previousPublishedReleaseId: 'release-0',
      },
    });

    await expect(
      mappingReleaseService.rollbackRelease('workspace-1', 'release-1')
    ).resolves.toMatchObject({ status: 'deprecated' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-releases/release-1/rollback'
    );
  });

  it('recusa mutação que tenta trocar a identidade do recurso', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ...governanceSnapshot, releaseId: 'release-alheia' },
    });

    await expect(
      mappingReleaseService.approveRelease('workspace-1', 'release-1', 'Revisão concluída.')
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});
