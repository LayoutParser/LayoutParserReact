import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mappingDraftService } from '../../services/api/mappingDraftService';
import { workspaceService } from '../../services/api/workspaceService';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import MappingStudioPage from './MappingStudioPage';

vi.mock('../../services/api/workspaceService', () => ({
  workspaceService: { getMappingExplanation: vi.fn() },
}));

vi.mock('../../services/api/mappingDraftService', async importOriginal => {
  const original = await importOriginal<typeof import('../../services/api/mappingDraftService')>();
  return {
    ...original,
    mappingDraftService: {
      getDraft: vi.fn(),
      createSuggestion: vi.fn(),
      getSuggestion: vi.fn(),
      cancelSuggestion: vi.fn(),
      updateRule: vi.fn(),
    },
  };
});

const capabilities = {
  execute: true,
  explain: true,
  author: false,
  compile: false,
  publish: false,
};

const sysmiddleExplanation = {
  mappingId: 'mapper-1',
  version: 'current',
  engine: 'sysmiddle' as const,
  capabilities,
  sourceSchema: { layoutGuid: 'source-guid', description: 'TXT FIAT' },
  targetSchema: { layoutGuid: 'target-guid', description: 'NF-e 4.00' },
  rules: [
    {
      ruleId: 'rule-1',
      sourceRefs: ['I.CNPJ'],
      targetRefs: ['T.emit.CNPJ'],
      condition: null,
      operations: ['copy'],
      cardinality: '1:1',
      evidence: [{ kind: 'sysmiddle-link-mapping', reference: 'CNPJ emitente' }],
      humanDescription: 'Copia o CNPJ do emitente para o XML.',
      technicalDetail: null,
      supportLevel: 'authoritative' as const,
    },
  ],
  description: 'Mapper atual da NF-e',
  limitations: [],
  opaqueRuleCount: 0,
};

const draftRule = {
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
  status: 'proposed' as const,
  questions: [],
  createdAt: '2026-08-31T19:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

const draft = {
  draftId: 'draft-1',
  workspaceId: 'workspace-1',
  packageId: 'package-1',
  revisionId: 'revision-1',
  engine: 'tcl' as const,
  createdAt: '2026-08-31T19:00:00Z',
  rules: [draftRule],
};

const tclExplanation = {
  ...sysmiddleExplanation,
  mappingId: 'draft-1',
  version: 'draft',
  engine: 'tcl' as const,
  capabilities: { ...capabilities, execute: false, author: true },
  sourceSchema: null,
  targetSchema: null,
  description: null,
};

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="workspace/mapping-studio" element={<MappingStudioPage />} />
        <Route
          path="workspace/mapping-studio/:mappingId/:version"
          element={<MappingStudioPage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('MappingStudioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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

  it('abre um mapping a partir da entrada sem persistir o identificador', async () => {
    vi.mocked(workspaceService.getMappingExplanation).mockResolvedValue(sysmiddleExplanation);
    renderRoute('/workspace/mapping-studio');

    fireEvent.change(screen.getByLabelText('Identificador do draft ou mapping'), {
      target: { value: 'mapper-1' },
    });
    fireEvent.change(screen.getByLabelText('Tipo de leitura'), { target: { value: 'current' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir mapping' }));

    expect(await screen.findByRole('heading', { name: 'Mapper atual da NF-e' })).toBeVisible();
    expect(window.localStorage).toHaveLength(0);
  });

  it('renderiza Sysmiddle somente leitura sem controles de autoria', async () => {
    vi.mocked(workspaceService.getMappingExplanation).mockResolvedValue(sysmiddleExplanation);

    renderRoute('/workspace/mapping-studio/mapper-1/current');

    expect(await screen.findByRole('heading', { name: 'Mapper atual da NF-e' })).toBeVisible();
    expect(screen.getByText('Somente leitura')).toBeVisible();
    expect(screen.getByText(/não cria, altera, corrige, compila nem publica/i)).toBeVisible();
    expect(screen.getByText('Copia o CNPJ do emitente para o XML.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Aceitar proposta' })).not.toBeInTheDocument();
    expect(mappingDraftService.getDraft).not.toHaveBeenCalled();
  });

  it('revisa uma proposta TCL e atualiza a explicação após o ETag ser aceito', async () => {
    vi.mocked(workspaceService.getMappingExplanation).mockResolvedValue(tclExplanation);
    vi.mocked(mappingDraftService.getDraft).mockResolvedValue(draft);
    vi.mocked(mappingDraftService.updateRule).mockResolvedValue({
      ...draftRule,
      status: 'accepted',
      eTag: 'AAAAAAAAAAI=',
    });

    renderRoute('/workspace/mapping-studio/draft-1/draft');

    const accept = await screen.findByRole('button', { name: 'Aceitar proposta' });
    fireEvent.click(accept);

    await waitFor(() =>
      expect(mappingDraftService.updateRule).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        ruleId: 'rule-1',
        eTag: 'AAAAAAAAAAE=',
        status: 'accepted',
      })
    );
    expect(await screen.findByText('Aceita')).toBeVisible();
    expect(workspaceService.getMappingExplanation).toHaveBeenCalledTimes(2);
  });
});
