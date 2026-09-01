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
    ).resolves.toEqual(release);
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
});
