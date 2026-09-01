import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { workspaceService } from './workspaceService';

vi.mock('../api', () => ({
  default: { get: vi.fn() },
}));

describe('workspaceService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('busca os workspaces do principal autenticado sem enviar identidade pelo browser', async () => {
    const payload = {
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Meu workspace fiscal',
          kind: 'personal',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(workspaceService.getCurrentWorkspaces()).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith('/api/workspaces/me');
  });

  it.each([
    null,
    { activeWorkspaceId: '', workspaces: [] },
    { activeWorkspaceId: 'workspace-2', workspaces: [] },
    {
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Workspace',
          kind: 'desconhecido',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    },
  ])('recusa resposta de workspace que viola o contrato', async payload => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(workspaceService.getCurrentWorkspaces()).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('lista análises com IDs codificados e filtros fiscais', async () => {
    const payload = { items: [], nextCursor: null };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });
    const filters = { documentType: 'nfe' as const, status: 'completed' as const };

    await expect(
      workspaceService.listAnalyses('workspace / fiscal', 'projeto 1', filters)
    ).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace%20%2F%20fiscal/projects/projeto%201/analyses',
      { params: filters }
    );
  });

  it('busca a explicação de uma versão de mapping', async () => {
    const payload = {
      mappingId: 'mapping-1',
      version: 'draft',
      engine: 'xslt',
      capabilities: {
        execute: true,
        explain: true,
        author: true,
        compile: false,
        publish: false,
      },
      sourceSchema: null,
      targetSchema: null,
      rules: [],
      description: null,
      opaqueRuleCount: 0,
      limitations: ['Draft ainda não compilado.'],
    } as const;
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(
      workspaceService.getMappingExplanation('workspace-1', 'mapping-1', 'draft')
    ).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mappings/mapping-1/versions/draft/explanation'
    );
  });

  it('recusa explicação que amplia capabilities ou vocabulário sem contrato', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        mappingId: 'mapping-1',
        version: 'current',
        engine: 'sysmiddle',
        capabilities: { execute: true, explain: true, author: true },
        sourceSchema: null,
        targetSchema: null,
        rules: [],
        description: null,
        opaqueRuleCount: 0,
        limitations: [],
      },
    });

    await expect(
      workspaceService.getMappingExplanation('workspace', 'mapping', 'current')
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it.each([
    () => workspaceService.listAnalyses('', 'project', {}),
    () => workspaceService.listAnalyses('workspace', ' ', {}),
    () => workspaceService.getMappingExplanation('workspace', 'mapping', ''),
    () => workspaceService.getMappingExplanation('workspace', '', 'draft'),
  ])('recusa recurso ou versão inválida antes de chamar a API', async action => {
    await expect(action()).rejects.toThrow();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
