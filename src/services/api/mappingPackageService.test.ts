import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { MappingPackageRequestError, mappingPackageService } from './mappingPackageService';

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const packageResponse = {
  packageId: 'package-1',
  workspaceId: 'workspace-1',
  projectId: 'project-1',
  name: 'FIAT NF-e 4.00',
  createdAt: '2026-08-31T18:00:00Z',
  revisions: [
    {
      revisionId: 'revision-1',
      revisionNumber: 1,
      createdAt: '2026-08-31T18:00:00Z',
      artifacts: [
        {
          artifactId: 'artifact-1',
          kind: 'sample',
          sha256: 'a'.repeat(64),
          sizeBytes: 18,
          originalFileName: 'fiat.txt',
          inspectionStatus: 'pending',
          uploadedAt: '2026-08-31T18:00:00Z',
        },
      ],
    },
  ],
};

describe('mappingPackageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia os artefatos com kinds explícitos e chave idempotente', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: packageResponse });
    const sample = new File(['HDR documento fiscal'], 'fiat.txt', { type: 'text/plain' });

    await expect(
      mappingPackageService.createPackage({
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        name: ' FIAT NF-e 4.00 ',
        idempotencyKey: 'attempt-1',
        artifacts: [{ kind: 'sample', file: sample }],
      })
    ).resolves.toEqual(packageResponse);

    const [path, body, config] = vi.mocked(apiClient.post).mock.calls[0];
    expect(path).toBe('/api/workspaces/workspace-1/projects/project-1/mapping-packages');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('name')).toBe('FIAT NF-e 4.00');
    expect((body as FormData).get('sample')).toBe(sample);
    expect(config).toMatchObject({ headers: { 'Idempotency-Key': 'attempt-1' } });
  });

  it('consulta somente metadados do pacote no workspace ativo', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: packageResponse });

    await expect(mappingPackageService.getPackage('workspace-1', 'package-1')).resolves.toEqual(
      packageResponse
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-packages/package-1'
    );
  });

  it.each([
    {
      idempotencyKey: '',
      artifacts: [{ kind: 'sample' as const, file: new File(['x'], 'sample.txt') }],
    },
    { idempotencyKey: 'attempt', artifacts: [] },
    {
      idempotencyKey: 'attempt',
      artifacts: [{ kind: 'xsd' as const, file: new File(['<x/>'], 'schema.xml') }],
    },
    {
      idempotencyKey: 'attempt',
      artifacts: [{ kind: 'sample' as const, file: new File([], 'sample.txt') }],
    },
  ])('recusa upload inválido antes de enviar conteúdo fiscal', async partialInput => {
    await expect(
      mappingPackageService.createPackage({
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        ...partialInput,
      })
    ).rejects.toMatchObject({ kind: 'invalid_input' });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('propaga rejeição sanitizada da API sem registrar o arquivo', async () => {
    const apiError = {
      isAxiosError: true,
      response: { status: 422, data: { error: 'MIME real diverge do esperado.' } },
    };
    vi.mocked(apiClient.post).mockRejectedValue(apiError);
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const promise = mappingPackageService.createPackage({
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      idempotencyKey: 'attempt',
      artifacts: [{ kind: 'sample', file: new File(['x'], 'sample.txt') }],
    });

    await expect(promise).rejects.toEqual(
      new MappingPackageRequestError('rejected', 'MIME real diverge do esperado.')
    );
  });

  it('recusa resposta incompleta em vez de ativar um pacote inconsistente', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { ...packageResponse, revisions: [] },
    });

    await expect(
      mappingPackageService.getPackage('workspace-1', 'package-1')
    ).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });
});
