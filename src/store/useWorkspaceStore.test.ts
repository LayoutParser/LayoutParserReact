import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workspaceService } from '../services/api/workspaceService';
import { useWorkspaceStore } from './useWorkspaceStore';

vi.mock('../services/api/workspaceService', () => ({
  workspaceService: { getCurrentWorkspaces: vi.fn() },
}));

const personalWorkspace = {
  workspaceId: 'workspace-1',
  name: 'Meu workspace fiscal',
  kind: 'personal' as const,
  role: 'owner' as const,
  createdAt: '2026-08-31T12:00:00Z',
};

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.getState().reset();
  });

  it('carrega o workspace ativo sem persistência no navegador', async () => {
    vi.mocked(workspaceService.getCurrentWorkspaces).mockResolvedValue({
      activeWorkspaceId: personalWorkspace.workspaceId,
      workspaces: [personalWorkspace],
    });

    await useWorkspaceStore.getState().loadWorkspaces();

    expect(useWorkspaceStore.getState()).toMatchObject({
      status: 'ready',
      activeWorkspaceId: personalWorkspace.workspaceId,
      workspaces: [personalWorkspace],
      error: null,
    });
    expect(localStorage.length).toBe(0);
  });

  it('não repete consulta resolvida sem force', async () => {
    vi.mocked(workspaceService.getCurrentWorkspaces).mockResolvedValue({
      activeWorkspaceId: personalWorkspace.workspaceId,
      workspaces: [personalWorkspace],
    });

    await useWorkspaceStore.getState().loadWorkspaces();
    await useWorkspaceStore.getState().loadWorkspaces();

    expect(workspaceService.getCurrentWorkspaces).toHaveBeenCalledOnce();
  });

  it('expõe falha segura e permite nova tentativa', async () => {
    vi.mocked(workspaceService.getCurrentWorkspaces)
      .mockRejectedValueOnce(new Error('Serviço indisponível.'))
      .mockResolvedValueOnce({
        activeWorkspaceId: personalWorkspace.workspaceId,
        workspaces: [personalWorkspace],
      });

    await useWorkspaceStore.getState().loadWorkspaces();
    expect(useWorkspaceStore.getState()).toMatchObject({
      status: 'error',
      error: 'Serviço indisponível.',
    });

    await useWorkspaceStore.getState().loadWorkspaces(true);
    expect(useWorkspaceStore.getState().status).toBe('ready');
  });

  it('seleciona somente workspace pertencente à resposta autenticada', () => {
    useWorkspaceStore.setState({
      status: 'ready',
      workspaces: [personalWorkspace],
      activeWorkspaceId: personalWorkspace.workspaceId,
      error: null,
    });

    useWorkspaceStore.getState().selectWorkspace('workspace-forjado');
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(personalWorkspace.workspaceId);
  });
});
