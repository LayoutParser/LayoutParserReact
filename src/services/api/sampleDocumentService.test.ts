import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { GenerateSampleDocumentError, sampleDocumentService } from './sampleDocumentService';

vi.mock('../api', () => ({
  default: {
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

describe('sampleDocumentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(axios, 'isAxiosError').mockImplementation(
      (value: unknown): value is import('axios').AxiosError =>
        typeof value === 'object' &&
        value !== null &&
        (value as { isAxiosError?: boolean }).isAxiosError === true
    );
  });

  it('chama POST /api/layouts/{layoutGuid}/generate-sample com o corpo informado', async () => {
    const response = {
      generatedDocument: 'HDR000001EXEMPLO0001',
      format: 'positional' as const,
      warnings: [],
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: response });

    await expect(
      sampleDocumentService.generateSampleDocument('LAY_guid-123', {
        numberOfRecords: 2,
        seed: 42,
      })
    ).resolves.toEqual(response);

    expect(apiClient.post).toHaveBeenCalledWith('/api/layouts/LAY_guid-123/generate-sample', {
      numberOfRecords: 2,
      seed: 42,
    });
  });

  it('encode o layoutGuid na URL', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { generatedDocument: '<a/>', format: 'xml', warnings: [] },
    });

    await sampleDocumentService.generateSampleDocument('LAY guid/123');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/layouts/LAY%20guid%2F123/generate-sample',
      {}
    );
  });

  it('rejeita com kind unknown_layout (400) quando o layoutGuid está vazio, sem chamar a API', async () => {
    await expect(sampleDocumentService.generateSampleDocument('')).rejects.toMatchObject({
      kind: 'unknown_layout',
      httpStatus: 400,
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('converte o 400 da API em kind unknown_layout', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(axiosError(400));

    const error = await sampleDocumentService.generateSampleDocument('LAY_guid-123').catch(e => e);

    expect(error).toBeInstanceOf(GenerateSampleDocumentError);
    expect(error).toMatchObject({ kind: 'unknown_layout', httpStatus: 400 });
  });

  it('converte o 404 da API em kind no_mapper', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(axiosError(404));

    const error = await sampleDocumentService.generateSampleDocument('LAY_guid-123').catch(e => e);

    expect(error).toBeInstanceOf(GenerateSampleDocumentError);
    expect(error).toMatchObject({ kind: 'no_mapper', httpStatus: 404 });
    expect(error.message).toContain('TCL/XSL/XSLT');
  });

  it('converte falha 5xx em kind server_error', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(axiosError(500));

    const error = await sampleDocumentService.generateSampleDocument('LAY_guid-123').catch(e => e);

    expect(error).toBeInstanceOf(GenerateSampleDocumentError);
    expect(error).toMatchObject({ kind: 'server_error', httpStatus: 500 });
  });

  it('converte falha de rede (sem response) em kind network_error', async () => {
    const error = new Error('Network Error') as Error & { isAxiosError: true };
    error.isAxiosError = true;
    vi.mocked(apiClient.post).mockRejectedValue(error);

    const rejected = await sampleDocumentService
      .generateSampleDocument('LAY_guid-123')
      .catch(e => e);

    expect(rejected).toBeInstanceOf(GenerateSampleDocumentError);
    expect(rejected).toMatchObject({ kind: 'network_error' });
  });
});
