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
    const payload = { activeWorkspaceId: 'workspace-1', workspaces: [] };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(workspaceService.getCurrentWorkspaces()).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith('/api/workspaces/me');
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
      version: 2,
      engine: 'xslt',
      supportLevel: 'authoritative',
      sourceSchema: {
        schemaId: 'source',
        format: 'fixed_width',
        fiscalDocumentType: 'nfe',
        version: '4.00',
      },
      targetSchema: {
        schemaId: 'target',
        format: 'xml',
        fiscalDocumentType: 'nfe',
        version: '4.00',
      },
      rules: [],
      opaqueRuleCount: 0,
      limitations: [],
    } as const;
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(
      workspaceService.getMappingExplanation('workspace-1', 'mapping-1', 2)
    ).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mappings/mapping-1/versions/2/explanation'
    );
  });

  it.each([
    () => workspaceService.listAnalyses('', 'project', {}),
    () => workspaceService.listAnalyses('workspace', ' ', {}),
    () => workspaceService.getMappingExplanation('workspace', 'mapping', 0),
    () => workspaceService.getMappingExplanation('workspace', 'mapping', 1.5),
  ])('recusa recurso ou versão inválida antes de chamar a API', async action => {
    await expect(action()).rejects.toThrow();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
