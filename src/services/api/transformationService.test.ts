import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import type {
  AiCandidateStatus,
  TransformationCandidatesRequest,
  TransformationCandidatesResponse,
} from '../../types/transformation';
import { transformationService } from './transformationService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const request: TransformationCandidatesRequest = {
  inputContent: 'DOCUMENTO',
  layoutName: 'Layout NFe',
  layoutGuid: 'LAY_guid-123',
  sourceDocumentType: '',
  targetDocumentType: '',
  validate: true,
  expectedOutput: '',
};

const response: TransformationCandidatesResponse = {
  success: true,
  candidates: [],
  recommendedCandidateId: null,
  warnings: ['Nenhum mapper aplicável'],
};

describe('transformationService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(apiClient.get).mockReset();
  });

  it('usa a rota real sem hífen e preserva o contrato de candidatos', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: response });

    await expect(transformationService.executeTransformationCandidates(request)).resolves.toEqual(
      response
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/transformationexecution/execute-candidates',
      request
    );
  });

  describe('getAiCandidateStatus', () => {
    it('consulta a rota de polling com o ticket informado', async () => {
      const status: AiCandidateStatus = {
        status: 'running',
        candidate: null,
        diagnostics: null,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: status });

      await expect(transformationService.getAiCandidateStatus('abc-123')).resolves.toEqual(status);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/transformationexecution/execute-candidates/abc-123/ia-status'
      );
    });

    it('codifica o ticket na URL', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { status: 'running', candidate: null, diagnostics: null },
      });

      await transformationService.getAiCandidateStatus('tick et/raro');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/transformationexecution/execute-candidates/tick%20et%2Fraro/ia-status'
      );
    });

    it('trata 404 como status not-found, não como exceção', async () => {
      const error = new AxiosError('Not Found');
      error.response = { status: 404, data: {} } as AxiosError['response'];
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(transformationService.getAiCandidateStatus('expirado')).resolves.toEqual({
        status: 'not-found',
        candidate: null,
        diagnostics: null,
      });
    });

    it('propaga erro de infraestrutura como Error amigável', async () => {
      const error = new AxiosError('Network Error');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(transformationService.getAiCandidateStatus('t1')).rejects.toThrow(
        'Network Error'
      );
    });
  });
});
