import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import type {
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
});
