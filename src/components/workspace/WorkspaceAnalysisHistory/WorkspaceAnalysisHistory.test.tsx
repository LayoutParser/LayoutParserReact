import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workspaceService } from '../../../services/api/workspaceService';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import WorkspaceAnalysisHistory from './WorkspaceAnalysisHistory';

vi.mock('../../../services/api/workspaceService', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/workspaceService')>(
    '../../../services/api/workspaceService'
  );
  return {
    ...actual,
    workspaceService: {
      ...actual.workspaceService,
      listAnalyses: vi.fn(),
    },
  };
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/workspace/analyses" element={<WorkspaceAnalysisHistory />} />
        <Route path="/workspace/analyses/:projectId" element={<WorkspaceAnalysisHistory />} />
      </Routes>
    </MemoryRouter>
  );

describe('WorkspaceAnalysisHistory', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset();
    vi.mocked(workspaceService.listAnalyses).mockReset();
  });

  it('pede o identificador do projeto quando nenhum foi informado', () => {
    renderAt('/workspace/analyses');

    expect(
      screen.getByRole('heading', { name: 'Consulte análises fiscais persistidas' })
    ).toBeVisible();
    expect(screen.getByLabelText('Identificador do projeto')).toBeVisible();
  });

  it('lista as análises retornadas pela API para o projeto informado', async () => {
    useWorkspaceStore.setState({
      status: 'ready',
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Workspace fiscal',
          kind: 'personal',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    });
    vi.mocked(workspaceService.listAnalyses).mockResolvedValue({
      items: [
        {
          analysisId: 'analysis-1',
          projectId: 'project-1',
          fileName: 'nota-fiscal.txt',
          format: 'fixed_width',
          fiscalProfile: { documentType: 'nfe', schemaVersion: '4.0', operation: 'emissao' },
          status: 'completed',
          layoutGuid: 'layout-1',
          correlationId: 'correlation-1',
          createdAt: '2026-08-31T12:00:00Z',
          completedAt: '2026-08-31T12:01:00Z',
        },
      ],
      nextCursor: null,
    });

    renderAt('/workspace/analyses/project-1');

    await waitFor(() => expect(screen.getByText('nota-fiscal.txt')).toBeVisible());
    expect(workspaceService.listAnalyses).toHaveBeenCalledWith('workspace-1', 'project-1', {});
    expect(screen.getByText('Concluída')).toBeVisible();
  });

  it('mostra estado vazio quando o projeto não tem análises', async () => {
    useWorkspaceStore.setState({
      status: 'ready',
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Workspace fiscal',
          kind: 'personal',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    });
    vi.mocked(workspaceService.listAnalyses).mockResolvedValue({ items: [], nextCursor: null });

    renderAt('/workspace/analyses/project-empty');

    await waitFor(() => expect(screen.getByText('Nenhuma análise registrada')).toBeVisible());
  });

  it('mostra erro amigável e permite tentar novamente', async () => {
    useWorkspaceStore.setState({
      status: 'ready',
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Workspace fiscal',
          kind: 'personal',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    });
    vi.mocked(workspaceService.listAnalyses).mockRejectedValue(
      new Error('O histórico de análises está temporariamente indisponível.')
    );

    renderAt('/workspace/analyses/project-error');

    await waitFor(() =>
      expect(
        screen.getByText('O histórico de análises está temporariamente indisponível.')
      ).toBeVisible()
    );
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });
});
