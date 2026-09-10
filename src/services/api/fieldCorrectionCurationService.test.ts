import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import {
  FieldCorrectionCurationError,
  fieldCorrectionCurationService,
} from './fieldCorrectionCurationService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

/** Reproduz a forma de `AxiosError` que os catches do serviço inspecionam via `axios.isAxiosError`. */
const axiosError = (status: number): unknown => {
  const error = new Error(`Request failed with status code ${status}`) as Error & {
    isAxiosError: true;
    response: { status: number };
  };
  error.isAxiosError = true;
  error.response = { status };
  return error;
};

describe('fieldCorrectionCurationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(axios, 'isAxiosError').mockImplementation(
      (value: unknown): value is import('axios').AxiosError =>
        typeof value === 'object' &&
        value !== null &&
        (value as { isAxiosError?: boolean }).isAxiosError === true
    );
  });

  it('busca a fila via GET /api/transformation/field-correction/pending', async () => {
    const report = {
      reportId: 'rpt-1',
      documentId: 'doc-1',
      nodePath: '/NFe/infNFe/det[1]/prod/vProd',
      originalValue: '10,00',
      correctedValue: '10,50',
      reportedAt: '2026-09-10T12:00:00Z',
      status: 'pending' as const,
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { reports: [report] } });

    await expect(fieldCorrectionCurationService.getPending()).resolves.toEqual([report]);
    expect(apiClient.get).toHaveBeenCalledWith('/api/transformation/field-correction/pending');
  });

  it('converte falha ao buscar a fila em server_error', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(axiosError(500));

    const error = await fieldCorrectionCurationService.getPending().catch(e => e);

    expect(error).toBeInstanceOf(FieldCorrectionCurationError);
    expect(error).toMatchObject({ kind: 'server_error', httpStatus: 500 });
  });

  it('envia a decisão via POST /api/transformation/field-correction/{reportId}/review', async () => {
    const updated = {
      reportId: 'rpt-1',
      documentId: 'doc-1',
      nodePath: '/NFe/infNFe/det[1]/prod/vProd',
      originalValue: '10,00',
      correctedValue: '10,50',
      reportedAt: '2026-09-10T12:00:00Z',
      status: 'reviewed_accepted' as const,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: updated });

    await expect(fieldCorrectionCurationService.review('rpt-1', 'accepted')).resolves.toEqual(
      updated
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/transformation/field-correction/rpt-1/review',
      { decision: 'accepted' }
    );
  });

  it('encode o reportId na URL', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { status: 'reviewed_rejected' },
    });

    await fieldCorrectionCurationService.review('rpt/1 x', 'rejected');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/transformation/field-correction/rpt%2F1%20x/review',
      { decision: 'rejected' }
    );
  });

  it('converte 404 da revisão em kind not_found', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(axiosError(404));

    const error = await fieldCorrectionCurationService.review('rpt-1', 'accepted').catch(e => e);

    expect(error).toBeInstanceOf(FieldCorrectionCurationError);
    expect(error).toMatchObject({ kind: 'not_found', httpStatus: 404 });
  });

  it('converte falha de rede (sem response) em kind network_error', async () => {
    const error = new Error('Network Error') as Error & { isAxiosError: true };
    error.isAxiosError = true;
    vi.mocked(apiClient.post).mockRejectedValue(error);

    const rejected = await fieldCorrectionCurationService.review('rpt-1', 'accepted').catch(e => e);

    expect(rejected).toBeInstanceOf(FieldCorrectionCurationError);
    expect(rejected).toMatchObject({ kind: 'network_error' });
  });
});
