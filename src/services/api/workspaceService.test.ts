import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { workspaceService } from './workspaceService';

vi.mock('../api', () => ({
  default: { get: vi.fn() },
}));

describe('workspaceService', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('busca os workspaces do principal autenticado sem enviar identidade pelo browser', async () => {
    const payload = {
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Meu workspace fiscal',
          kind: 'personal',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(workspaceService.getCurrentWorkspaces()).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith('/api/workspaces/me');
  });

  it.each([
    null,
    { activeWorkspaceId: '', workspaces: [] },
    { activeWorkspaceId: 'workspace-2', workspaces: [] },
    {
      activeWorkspaceId: 'workspace-1',
      workspaces: [
        {
          workspaceId: 'workspace-1',
          name: 'Workspace',
          kind: 'desconhecido',
          role: 'owner',
          createdAt: '2026-08-31T12:00:00Z',
        },
      ],
    },
  ])('recusa resposta de workspace que viola o contrato', async payload => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(workspaceService.getCurrentWorkspaces()).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });

  it('lista análises com IDs codificados e filtros fiscais', async () => {
    const payload = { items: [], nextCursor: null };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });
    const filters = { documentType: 'nfe' as const, status: 'completed' as const };

    await expect(
      workspaceService.listAnalyses('workspace / fiscal', 'projeto 1', filters)
    ).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace%20%2F%20fiscal/projects/projeto%201/analyses',
      { params: filters }
    );
  });

  it('busca a explicação de uma versão de mapping', async () => {
    const payload = {
      mappingId: 'mapping-1',
      version: 'draft',
      engine: 'xslt',
      capabilities: {
        execute: true,
        explain: true,
        author: true,
        compile: false,
        publish: false,
      },
      sourceSchema: null,
      targetSchema: null,
      rules: [],
      description: null,
      opaqueRuleCount: 0,
      limitations: ['Draft ainda não compilado.'],
    } as const;
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    await expect(
      workspaceService.getMappingExplanation('workspace-1', 'mapping-1', 'draft')
    ).resolves.toEqual(payload);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/workspaces/workspace-1/mappings/mapping-1/versions/draft/explanation'
    );
  });

  it('recusa explicação que amplia capabilities ou vocabulário sem contrato', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        mappingId: 'mapping-1',
        version: 'current',
        engine: 'sysmiddle',
        capabilities: { execute: true, explain: true, author: true },
        sourceSchema: null,
        targetSchema: null,
        rules: [],
        description: null,
        opaqueRuleCount: 0,
        limitations: [],
      },
    });

    await expect(
      workspaceService.getMappingExplanation('workspace', 'mapping', 'current')
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('aceita regras cuja API omite condition/technicalDetail em vez de enviar null', async () => {
    const baseRule = {
      ruleId: 'RULE-1',
      sourceRefs: ['SRC-1'],
      targetRefs: ['TGT-1'],
      operations: ['copy'],
      cardinality: '1:1',
      evidence: [{ kind: 'sample', reference: 'linha-1' }],
      humanDescription: 'Copia o campo X para Y.',
      supportLevel: 'authoritative' as const,
    };

    const payload = {
      mappingId: 'mapping-1',
      version: 'current',
      engine: 'xslt',
      capabilities: {
        execute: true,
        explain: true,
        author: true,
        compile: false,
        publish: false,
      },
      sourceSchema: null,
      targetSchema: null,
      description: null,
      opaqueRuleCount: 0,
      limitations: [],
      rules: [
        // sem `condition` na chave
        { ...baseRule, ruleId: 'RULE-SEM-CONDITION', technicalDetail: null },
        // sem `technicalDetail` na chave
        { ...baseRule, ruleId: 'RULE-SEM-TECHNICAL-DETAIL', condition: null },
        // sem `condition` nem `technicalDetail`
        { ...baseRule, ruleId: 'RULE-SEM-AMBOS' },
        // ambos presentes como null explícito
        { ...baseRule, ruleId: 'RULE-COM-AMBOS-NULL', condition: null, technicalDetail: null },
      ],
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    const result = await workspaceService.getMappingExplanation(
      'workspace-1',
      'mapping-1',
      'current'
    );

    expect(result.rules).toHaveLength(4);
    for (const rule of result.rules) {
      expect(rule.condition).toBeNull();
      expect(rule.technicalDetail).toBeNull();
    }
  });

  it.each([
    { execute: true, explain: true, author: true, compile: false, publish: false },
    { execute: true, explain: true, author: false, compile: true, publish: false },
    { execute: true, explain: true, author: false, compile: false, publish: true },
  ])('falha fechado quando Sysmiddle anuncia mutação em %o', async capabilities => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        mappingId: 'mapper-sysmiddle',
        version: 'current',
        engine: 'sysmiddle',
        capabilities,
        sourceSchema: null,
        targetSchema: null,
        rules: [],
        description: null,
        opaqueRuleCount: 0,
        limitations: [],
      },
    });

    await expect(
      workspaceService.getMappingExplanation('workspace', 'mapper-sysmiddle', 'current')
    ).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it.each([
    () => workspaceService.listAnalyses('', 'project', {}),
    () => workspaceService.listAnalyses('workspace', ' ', {}),
    () => workspaceService.getMappingExplanation('workspace', 'mapping', ''),
    () => workspaceService.getMappingExplanation('workspace', '', 'draft'),
  ])('recusa recurso ou versão inválida antes de chamar a API', async action => {
    await expect(action()).rejects.toThrow();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  describe('getMappingLayoutTree', () => {
    it('busca a árvore dupla de um mapping por GUID', async () => {
      const payload = {
        source: {
          roots: [
            {
              guid: 'src-root-1',
              name: 'Documento',
              kind: 'element',
              cardinality: { min: 1, max: 1 },
              children: [
                {
                  guid: 'src-leaf-1',
                  name: 'Campo A',
                  kind: 'attribute',
                  cardinality: { min: 0, max: null },
                  children: [],
                },
              ],
            },
            {
              guid: 'src-root-2',
              name: 'Cabeçalho',
              kind: 'group',
              cardinality: { min: null, max: null },
              children: [],
            },
          ],
        },
        target: {
          roots: [
            {
              guid: 'tgt-root-1',
              name: 'NFe',
              kind: 'element',
              cardinality: { min: 1, max: 1 },
              children: [
                {
                  guid: 'tgt-leaf-1',
                  name: 'CampoB',
                  kind: 'attribute',
                  cardinality: { min: 1, max: 1 },
                  children: [],
                },
              ],
            },
          ],
        },
        rules: [
          { ruleId: 'RULE-1', sourceElementGuid: 'src-leaf-1', targetElementGuid: 'tgt-leaf-1' },
        ],
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

      await expect(
        workspaceService.getMappingLayoutTree('workspace 1', 'mapping/1')
      ).resolves.toEqual(payload);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/workspaces/workspace%201/mappings/mapping%2F1/layout-tree'
      );
    });

    it('aceita múltiplas raízes e cardinalidade totalmente nula', async () => {
      const payload = {
        source: {
          roots: [
            {
              guid: 'a',
              name: 'A',
              kind: 'element',
              cardinality: { min: null, max: null },
              children: [],
            },
            {
              guid: 'b',
              name: 'B',
              kind: 'element',
              cardinality: { min: null, max: null },
              children: [],
            },
          ],
        },
        target: { roots: [] },
        rules: [],
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

      const result = await workspaceService.getMappingLayoutTree('workspace-1', 'mapping-1');
      expect(result.source.roots).toHaveLength(2);
      expect(result.target.roots).toHaveLength(0);
    });

    it.each([
      null,
      { source: null, target: { roots: [] }, rules: [] },
      { source: { roots: [] }, target: { roots: [] }, rules: 'not-an-array' },
      {
        source: {
          roots: [
            {
              guid: 'a',
              name: 'A',
              kind: 'invalid',
              cardinality: { min: 1, max: 1 },
              children: [],
            },
          ],
        },
        target: { roots: [] },
        rules: [],
      },
      {
        source: {
          roots: [
            {
              guid: 'a',
              name: 'A',
              kind: 'element',
              cardinality: { min: '1', max: 1 },
              children: [],
            },
          ],
        },
        target: { roots: [] },
        rules: [],
      },
      {
        source: { roots: [] },
        target: { roots: [] },
        rules: [{ ruleId: 'r1', sourceElementGuid: 'a' }],
      },
    ])('recusa árvore de layout que viola o contrato', async payload => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

      await expect(
        workspaceService.getMappingLayoutTree('workspace-1', 'mapping-1')
      ).rejects.toMatchObject({ kind: 'invalid_response' });
    });

    it('recusa workspace ou mapping vazio antes de chamar a API', async () => {
      await expect(workspaceService.getMappingLayoutTree('', 'mapping-1')).rejects.toThrow();
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });
});
