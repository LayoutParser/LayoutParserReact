import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { testSuiteService, TestSuiteRequestError } from './testSuiteService';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const suite = {
  suiteId: 'suite-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  name: 'Suíte NFe padrão',
  description: 'Cobre os casos comuns de NFe.',
  createdByUserId: 'user-1',
  createdAt: '2026-09-20T10:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

const fixture = {
  fixtureId: 'fixture-1',
  suiteId: 'suite-1',
  name: 'Caso feliz',
  inputXml: '<in/>',
  expectedXml: '<out/>',
  xsdVersion: null,
  sortOrder: 0,
  createdAt: '2026-09-20T10:05:00Z',
};

const run = {
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
    { fixtureId: 'fixture-1', fixtureName: 'Caso feliz', passed: true, durationMs: 100 },
  ],
};

describe('testSuiteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria uma suíte', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: suite });
    await expect(
      testSuiteService.createSuite({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        name: 'Suíte NFe padrão',
        description: 'Cobre os casos comuns de NFe.',
      })
    ).resolves.toEqual(suite);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-drafts/draft-1/test-suites',
      { name: 'Suíte NFe padrão', description: 'Cobre os casos comuns de NFe.' }
    );
  });

  it('rejeita criação de suíte sem nome', async () => {
    await expect(
      testSuiteService.createSuite({ workspaceId: 'workspace-1', draftId: 'draft-1', name: '  ' })
    ).rejects.toThrow(TestSuiteRequestError);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('lista suítes do draft', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [suite] });
    await expect(testSuiteService.listSuites('workspace-1', 'draft-1')).resolves.toEqual([suite]);
  });

  it('cria uma fixture na suíte', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: fixture });
    await expect(
      testSuiteService.createFixture({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        suiteId: 'suite-1',
        name: 'Caso feliz',
        inputXml: '<in/>',
        expectedXml: '<out/>',
      })
    ).resolves.toEqual(fixture);
  });

  it('lista fixtures da suíte', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [fixture] });
    await expect(
      testSuiteService.listFixtures('workspace-1', 'draft-1', 'suite-1')
    ).resolves.toEqual([fixture]);
  });

  it('executa a suíte de forma síncrona e devolve o resultado completo', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: run });
    const result = await testSuiteService.runSuite(
      'workspace-1',
      'draft-1',
      'suite-1',
      'release-1'
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-drafts/draft-1/test-suites/suite-1/run',
      { releaseId: 'release-1' }
    );
    expect(result.runId).toBe('run-1');
    expect(result.fixtureResults[0]).toMatchObject({ fixtureId: 'fixture-1', passed: true });
  });

  it('rejeita execução sem releaseId', async () => {
    await expect(
      testSuiteService.runSuite('workspace-1', 'draft-1', 'suite-1', '  ')
    ).rejects.toThrow(TestSuiteRequestError);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('lista o histórico de runs paginado', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [run], totalCount: 1 } });
    const result = await testSuiteService.listRuns('workspace-1', 'draft-1', 'suite-1');
    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({ runId: 'run-1', passed: 1, failed: 0 });
  });

  it('mapeia 404 para not_found', async () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    vi.mocked(apiClient.get).mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: {} },
    });
    await expect(
      testSuiteService.getSuite('workspace-1', 'draft-1', 'suite-1')
    ).rejects.toMatchObject({ kind: 'not_found' });
  });
});
