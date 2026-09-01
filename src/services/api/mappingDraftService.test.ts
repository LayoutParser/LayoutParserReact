import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { mappingDraftService } from './mappingDraftService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const rule = {
  ruleId: 'rule-1',
  draftId: 'draft-1',
  sourceRefs: ['layout://LINHA004/CNPJ'],
  targetRefs: ['xsd:///NFe/infNFe/emit/CNPJ'],
  operation: 'copy',
  conditions: '[]',
  transformations: '["trim"]',
  cardinality: '1:1',
  evidence: [{ kind: 'xsd', reference: '/NFe/infNFe/emit/CNPJ' }],
  confidence: 'high',
  status: 'proposed',
  questions: [],
  createdAt: '2026-08-31T19:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

const draft = {
  draftId: 'draft-1',
  workspaceId: 'workspace-1',
  packageId: 'package-1',
  revisionId: 'revision-1',
  engine: 'tcl',
  createdAt: '2026-08-31T19:00:00Z',
  rules: [rule],
};

describe('mappingDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria um draft sobre a revisão exata e nunca aceita Sysmiddle', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: draft });

    await expect(
      mappingDraftService.createDraft({
        workspaceId: 'workspace-1',
        packageId: 'package-1',
        revisionId: 'revision-1',
        engine: 'tcl',
      })
    ).resolves.toEqual(draft);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-packages/package-1/drafts',
      { revisionId: 'revision-1', engine: 'tcl' }
    );
  });

  it.each(['sysmiddle', ' sysmiddle ', ['xslt', 'sysmiddle'], { engine: 'xslt' }])(
    'não envia engine de autoria adulterado: %o',
    async engine => {
      await expect(
        mappingDraftService.createDraft({
          workspaceId: 'workspace-1',
          packageId: 'package-1',
          revisionId: 'revision-1',
          engine: engine as never,
        })
      ).rejects.toMatchObject({ kind: 'invalid_input' });

      expect(apiClient.post).not.toHaveBeenCalled();
    }
  );

  it('consulta o draft e valida que todas as regras pertencem a ele', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: draft });

    await expect(mappingDraftService.getDraft('workspace-1', 'draft-1')).resolves.toEqual(draft);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-drafts/draft-1'
    );

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { ...draft, rules: [{ ...rule, draftId: 'outro-draft' }] },
    });
    await expect(mappingDraftService.getDraft('workspace-1', 'draft-1')).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('inicia, observa e cancela o job assíncrono de sugestão', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { jobId: 'job-1', status: 'queued' },
    });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { jobId: 'job-1', status: 'completed', rulesCreated: 3, error: null },
    });
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 202 });

    await expect(mappingDraftService.createSuggestion('workspace-1', 'draft-1')).resolves.toEqual({
      jobId: 'job-1',
      status: 'queued',
    });
    await expect(
      mappingDraftService.getSuggestion('workspace-1', 'draft-1', 'job-1')
    ).resolves.toEqual({ jobId: 'job-1', status: 'completed', rulesCreated: 3, error: null });
    await expect(
      mappingDraftService.cancelSuggestion('workspace-1', 'draft-1', 'job-1')
    ).resolves.toBeUndefined();
  });

  it('envia If-Match citado ao aceitar uma regra', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { ...rule, status: 'accepted', eTag: 'AAAAAAAAAAI=' },
    });

    await expect(
      mappingDraftService.updateRule({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        ruleId: 'rule-1',
        eTag: 'AAAAAAAAAAE=',
        status: 'accepted',
      })
    ).resolves.toMatchObject({ status: 'accepted', eTag: 'AAAAAAAAAAI=' });

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mapping-drafts/draft-1/rules/rule-1',
      { status: 'accepted' },
      { headers: { 'If-Match': '"AAAAAAAAAAE="' } }
    );
  });

  it('preserva a regra atual devolvida em conflito 412', async () => {
    const conflict = {
      isAxiosError: true,
      response: {
        status: 412,
        data: {
          error: 'A regra foi alterada por outra operação.',
          current: { ...rule, status: 'edited', eTag: 'AAAAAAAAAAI=' },
        },
      },
    };
    vi.mocked(apiClient.patch).mockRejectedValue(conflict);
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const operation = mappingDraftService.updateRule({
      workspaceId: 'workspace-1',
      draftId: 'draft-1',
      ruleId: 'rule-1',
      eTag: 'AAAAAAAAAAE=',
      status: 'accepted',
    });

    await expect(operation).rejects.toMatchObject({
      kind: 'conflict',
      message: 'A regra foi alterada por outra operação.',
      currentRule: { status: 'edited', eTag: 'AAAAAAAAAAI=' },
    });
  });

  it('recusa payloads incompletos e respostas com status desconhecido', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { ...draft, rules: [{ ...rule, status: 'invented' }] },
    });

    await expect(mappingDraftService.getDraft('workspace-1', 'draft-1')).rejects.toMatchObject({
      kind: 'invalid_response',
    });
    await expect(mappingDraftService.getDraft('', 'draft-1')).rejects.toMatchObject({
      kind: 'invalid_input',
    });
  });

  it.each(['sysmiddle', ' sysmiddle ', ['tcl', 'sysmiddle'], { value: 'tcl' }])(
    'recusa Draft devolvido com engine adulterado: %o',
    async engine => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { ...draft, engine } });

      await expect(mappingDraftService.getDraft('workspace-1', 'draft-1')).rejects.toMatchObject({
        kind: 'invalid_response',
      });
    }
  );
});
