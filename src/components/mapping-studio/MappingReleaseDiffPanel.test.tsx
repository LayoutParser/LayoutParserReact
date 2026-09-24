import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MappingReleaseRequestError,
  mappingReleaseService,
} from '../../services/api/mappingReleaseService';
import type { MappingReleaseDiff } from '../../types/mappingRelease';
import MappingReleaseDiffPanel from './MappingReleaseDiffPanel';

vi.mock('../../services/api/mappingReleaseService', async () => {
  const actual = await vi.importActual<typeof import('../../services/api/mappingReleaseService')>(
    '../../services/api/mappingReleaseService'
  );
  return {
    MappingReleaseRequestError: actual.MappingReleaseRequestError,
    mappingReleaseService: {
      getReleasesDiff: vi.fn(),
    },
  };
});

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText('Release de origem (A)'), {
    target: { value: 'release-a' },
  });
  fireEvent.change(screen.getByLabelText('Release de destino (B)'), {
    target: { value: 'release-b' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Comparar releases' }));
};

describe('MappingReleaseDiffPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra as mudanças agregadas por elemento de schema', async () => {
    const diff: MappingReleaseDiff = {
      fromReleaseId: 'release-a',
      toReleaseId: 'release-b',
      changes: [
        { element: '/nfe/emit/CNPJ', changeKind: 'modified', fromValue: '123', toValue: '456' },
      ],
    };
    vi.mocked(mappingReleaseService.getReleasesDiff).mockResolvedValue(diff);

    render(<MappingReleaseDiffPanel workspaceId="workspace-1" draftId="draft-1" />);
    fillAndSubmit();

    await waitFor(() =>
      expect(mappingReleaseService.getReleasesDiff).toHaveBeenCalledWith(
        'workspace-1',
        'draft-1',
        'release-a',
        'release-b'
      )
    );
    expect(await screen.findByText('/nfe/emit/CNPJ')).toBeVisible();
    expect(screen.getByText('123')).toBeVisible();
    expect(screen.getByText('456')).toBeVisible();
  });

  it('mostra mensagem de nenhuma mudança quando changes está vazio', async () => {
    vi.mocked(mappingReleaseService.getReleasesDiff).mockResolvedValue({
      fromReleaseId: 'release-a',
      toReleaseId: 'release-b',
      changes: [],
    });

    render(<MappingReleaseDiffPanel workspaceId="workspace-1" draftId="draft-1" />);
    fillAndSubmit();

    expect(
      await screen.findByText('Nenhuma mudança encontrada entre release-a e release-b.')
    ).toBeVisible();
  });

  it('mostra erro de request sem quebrar a tela', async () => {
    vi.mocked(mappingReleaseService.getReleasesDiff).mockRejectedValue(
      new MappingReleaseRequestError('not_found', 'Release não encontrada.')
    );

    render(<MappingReleaseDiffPanel workspaceId="workspace-1" draftId="draft-1" />);
    fillAndSubmit();

    expect(await screen.findByText('Release não encontrada.')).toBeVisible();
  });

  it('não quebra quando a API devolve changes ausente (shape degradado, não confirmado)', async () => {
    vi.mocked(mappingReleaseService.getReleasesDiff).mockResolvedValue({
      fromReleaseId: 'release-a',
      toReleaseId: 'release-b',
    } as unknown as MappingReleaseDiff);

    render(<MappingReleaseDiffPanel workspaceId="workspace-1" draftId="draft-1" />);
    fillAndSubmit();

    expect(
      await screen.findByText('Nenhuma mudança encontrada entre release-a e release-b.')
    ).toBeVisible();
  });
});
