import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisHistoryService } from '../../../services/api/analysisHistoryService';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import AnalysisArchivePage from './AnalysisArchive';

vi.mock('../../../services/api/analysisHistoryService', () => ({
  AnalysisHistoryRequestError: class extends Error {
    kind: string;
    constructor(kind: string, message: string) {
      super(message);
      this.kind = kind;
    }
  },
  analysisHistoryService: {
    listAnalyses: vi.fn(),
    getAnalysis: vi.fn(),
    downloadFile: vi.fn(),
    deleteAnalysis: vi.fn(),
  },
}));

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="workspace/analysis-archive" element={<AnalysisArchivePage />} />
        <Route path="workspace/analysis-archive/:analysisId" element={<AnalysisArchivePage />} />
      </Routes>
    </MemoryRouter>
  );
}

const summary = {
  analysisId: 'analysis-1',
  createdAt: '2026-09-20T12:00:00Z',
  expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  source: 'upload' as const,
  layoutName: 'LAY_TXT_MQSERIES_ENVNFE_4.00_NFe',
  layoutGuid: 'layout-guid-1',
  detectedType: 'nfe',
  fileCount: 2,
  totalSizeBytes: 4096,
};

describe('AnalysisArchivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      error: null,
    });
  });

  it('lista análises arquivadas e mostra prazo de expiração', async () => {
    vi.mocked(analysisHistoryService.listAnalyses).mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [summary],
    });

    renderRoute('/workspace/analysis-archive');

    expect(await screen.findByText('LAY_TXT_MQSERIES_ENVNFE_4.00_NFe')).toBeVisible();
    expect(screen.getByText(/Expira em 5 dias/)).toBeVisible();
    expect(analysisHistoryService.listAnalyses).toHaveBeenCalledWith('workspace-1', 1, 20);
  });

  it('mostra estado vazio quando não há análises arquivadas', async () => {
    vi.mocked(analysisHistoryService.listAnalyses).mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 0,
      items: [],
    });

    renderRoute('/workspace/analysis-archive');

    expect(await screen.findByText('Nenhuma análise arquivada ainda')).toBeVisible();
  });

  it('exclui uma análise após confirmação em duas etapas', async () => {
    vi.mocked(analysisHistoryService.listAnalyses).mockResolvedValue({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [summary],
    });
    vi.mocked(analysisHistoryService.deleteAnalysis).mockResolvedValue(undefined);

    renderRoute('/workspace/analysis-archive');

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar exclusão' }));

    await waitFor(() =>
      expect(analysisHistoryService.deleteAnalysis).toHaveBeenCalledWith(
        'workspace-1',
        'analysis-1'
      )
    );
  });

  it('abre o detalhe de uma análise e trata 404 como "não existe"', async () => {
    const { AnalysisHistoryRequestError } =
      await import('../../../services/api/analysisHistoryService');
    vi.mocked(analysisHistoryService.getAnalysis).mockRejectedValue(
      new AnalysisHistoryRequestError('not_found', 'não existe')
    );

    renderRoute('/workspace/analysis-archive/analysis-1');

    expect(
      await screen.findByText('Esta análise não existe, expirou ou pertence a outro usuário.')
    ).toBeVisible();
  });

  it('carrega o detalhe com arquivos para download', async () => {
    vi.mocked(analysisHistoryService.getAnalysis).mockResolvedValue({
      analysisId: 'analysis-1',
      createdAt: '2026-09-20T12:00:00Z',
      expiresAt: summary.expiresAt,
      layout: {
        mode: 'upload',
        layoutGuid: 'layout-guid-1',
        layoutName: 'LAY_TXT_MQSERIES_ENVNFE_4.00_NFe',
        fileId: 'file-layout',
      },
      files: [
        {
          fileId: 'file-1',
          role: 'document',
          fileName: 'documento.txt',
          sizeBytes: 2048,
          sha256: 'abc123',
          downloadUrl: '/api/workspaces/workspace-1/analyses/analysis-1/files/file-1',
        },
      ],
    });

    renderRoute('/workspace/analysis-archive/analysis-1');

    expect(await screen.findByText('documento.txt')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Baixar' })).toBeVisible();
  });
});
