import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fieldCorrectionCurationService } from '../services/api/fieldCorrectionCurationService';
import { useFieldCorrectionCurationStore } from './useFieldCorrectionCurationStore';

vi.mock('../services/api/fieldCorrectionCurationService', () => ({
  fieldCorrectionCurationService: { getPending: vi.fn(), review: vi.fn() },
}));

const pendingReport = {
  reportId: 'rpt-1',
  documentId: 'doc-1',
  nodePath: '/NFe/infNFe/det[1]/prod/vProd',
  originalValue: '10,00',
  correctedValue: '10,50',
  reportedAt: '2026-09-10T12:00:00Z',
  status: 'pending' as const,
};

describe('useFieldCorrectionCurationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFieldCorrectionCurationStore.getState().reset();
  });

  it('carrega a fila pendente', async () => {
    vi.mocked(fieldCorrectionCurationService.getPending).mockResolvedValue([pendingReport]);

    await useFieldCorrectionCurationStore.getState().loadPending();

    expect(useFieldCorrectionCurationStore.getState()).toMatchObject({
      status: 'ready',
      reports: [pendingReport],
      error: null,
    });
  });

  it('expõe falha segura ao carregar a fila', async () => {
    vi.mocked(fieldCorrectionCurationService.getPending).mockRejectedValue(
      new Error('Serviço indisponível.')
    );

    await useFieldCorrectionCurationStore.getState().loadPending();

    expect(useFieldCorrectionCurationStore.getState()).toMatchObject({
      status: 'error',
      error: 'Serviço indisponível.',
    });
  });

  it('registra a decisão e atualiza o item com a resposta da API', async () => {
    useFieldCorrectionCurationStore.setState({ status: 'ready', reports: [pendingReport] });
    const updated = { ...pendingReport, status: 'reviewed_accepted' as const };
    vi.mocked(fieldCorrectionCurationService.review).mockResolvedValue(updated);

    await useFieldCorrectionCurationStore.getState().decide('rpt-1', 'accepted');

    expect(fieldCorrectionCurationService.review).toHaveBeenCalledWith('rpt-1', 'accepted');
    expect(useFieldCorrectionCurationStore.getState().reports).toEqual([updated]);
    expect(useFieldCorrectionCurationStore.getState().reviewing['rpt-1']).toBeUndefined();
  });

  it('não permite nova decisão sobre item já revisado (idempotência)', async () => {
    const reviewed = { ...pendingReport, status: 'reviewed_accepted' as const };
    useFieldCorrectionCurationStore.setState({ status: 'ready', reports: [reviewed] });

    await useFieldCorrectionCurationStore.getState().decide('rpt-1', 'rejected');

    expect(fieldCorrectionCurationService.review).not.toHaveBeenCalled();
  });

  it('expõe falha segura sem quebrar a fila ao registrar decisão', async () => {
    useFieldCorrectionCurationStore.setState({ status: 'ready', reports: [pendingReport] });
    vi.mocked(fieldCorrectionCurationService.review).mockRejectedValue(
      new Error('Não foi possível registrar a decisão.')
    );

    await useFieldCorrectionCurationStore.getState().decide('rpt-1', 'accepted');

    expect(useFieldCorrectionCurationStore.getState()).toMatchObject({
      error: 'Não foi possível registrar a decisão.',
    });
    expect(useFieldCorrectionCurationStore.getState().reports).toEqual([pendingReport]);
  });
});
