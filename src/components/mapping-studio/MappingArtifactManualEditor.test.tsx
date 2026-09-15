import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MappingReleaseRequestError,
  mappingReleaseService,
} from '../../services/api/mappingReleaseService';
import type { MappingReleaseArtifact } from '../../types/mappingRelease';
import MappingArtifactManualEditor from './MappingArtifactManualEditor';

vi.mock('../../services/api/mappingReleaseService', async () => {
  const actual = await vi.importActual<typeof import('../../services/api/mappingReleaseService')>(
    '../../services/api/mappingReleaseService'
  );
  return {
    MappingReleaseRequestError: actual.MappingReleaseRequestError,
    mappingReleaseService: {
      editArtifact: vi.fn(),
    },
  };
});

const artifact: MappingReleaseArtifact = {
  kind: 'xslt',
  content: '<xsl:stylesheet version="1.0"/>',
  hash: 'hash-original',
  generatedAt: '2026-09-01T00:00:00Z',
};

const release = {
  releaseId: 'release-2',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  engine: 'xslt' as const,
  artifacts: [{ ...artifact, hash: 'hash-new' }],
  sourceRuleIds: ['rule-1'],
  compileDiagnostics: [],
  rulesSnapshotHash: 'snapshot-hash',
  testRunSummary: null,
  status: 'draft_compiled' as const,
  correlationId: 'correlation-2',
  createdAt: '2026-09-01T00:05:00Z',
  eTag: 'AAAAAAAAAAI=',
  environment: null,
  approvedByUserId: null,
  approvedAt: null,
  approvalJustification: null,
  publishedByUserId: null,
  publishedAt: null,
  previousPublishedReleaseId: null,
  fiscalProfile: null,
  resolvedXsd: null,
  requiredCoverage: null,
  artifactSource: 'manual_edit' as const,
  derivedFromReleaseId: 'release-1',
  manualEditReason: 'Ajuste de arredondamento fiscal.',
  manuallyEditedArtifactKinds: ['xslt'],
};

describe('MappingArtifactManualEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não renderiza nada quando canEdit é falso', () => {
    render(
      <MappingArtifactManualEditor
        workspaceId="workspace-1"
        draftId="draft-1"
        engine="xslt"
        artifact={artifact}
        canEdit={false}
        onReleaseCreated={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Editar manualmente' })).not.toBeInTheDocument();
  });

  it('salva a edição e propaga a nova release derivada', async () => {
    vi.mocked(mappingReleaseService.editArtifact).mockResolvedValue(release);
    const onReleaseCreated = vi.fn();

    render(
      <MappingArtifactManualEditor
        workspaceId="workspace-1"
        draftId="draft-1"
        engine="xslt"
        artifact={artifact}
        canEdit
        onReleaseCreated={onReleaseCreated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar manualmente' }));
    fireEvent.change(screen.getByLabelText('Conteúdo do artefato'), {
      target: { value: '<xsl:stylesheet version="1.0"><!-- edit --></xsl:stylesheet>' },
    });
    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), {
      target: { value: 'Ajuste de arredondamento fiscal.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição manual' }));

    await waitFor(() =>
      expect(mappingReleaseService.editArtifact).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        engine: 'xslt',
        baseArtifactHash: 'hash-original',
        content: '<xsl:stylesheet version="1.0"><!-- edit --></xsl:stylesheet>',
        justification: 'Ajuste de arredondamento fiscal.',
      })
    );
    expect(onReleaseCreated).toHaveBeenCalledWith(release);
    expect(await screen.findByText(/nova release release-2 criada/)).toBeVisible();
  });

  it('mostra o artefato atual e permite recarregar em caso de conflito (412)', async () => {
    const currentArtifact: MappingReleaseArtifact = {
      ...artifact,
      content: '<current />',
      hash: 'hash-current',
    };
    vi.mocked(mappingReleaseService.editArtifact).mockRejectedValue(
      new MappingReleaseRequestError('conflict', 'Conflito de versão.', currentArtifact)
    );

    render(
      <MappingArtifactManualEditor
        workspaceId="workspace-1"
        draftId="draft-1"
        engine="xslt"
        artifact={artifact}
        canEdit
        onReleaseCreated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar manualmente' }));
    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), {
      target: { value: 'Tentativa concorrente.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição manual' }));

    expect(await screen.findByText(/O artefato mudou em outra sessão/)).toBeVisible();
    expect(screen.getByText('<current />')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar com este conteúdo' }));
    expect(screen.getByLabelText('Conteúdo do artefato')).toHaveValue('<current />');
  });

  it('reabre o hash atual quando a API exige If-Match (428)', async () => {
    vi.mocked(mappingReleaseService.editArtifact).mockRejectedValue(
      new MappingReleaseRequestError('precondition', 'Header If-Match ausente.')
    );

    render(
      <MappingArtifactManualEditor
        workspaceId="workspace-1"
        draftId="draft-1"
        engine="xslt"
        artifact={artifact}
        canEdit
        onReleaseCreated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar manualmente' }));
    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), {
      target: { value: 'Sem If-Match.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar edição manual' }));

    expect(await screen.findByText(/A API exigiu o hash atual/)).toBeVisible();
  });
});
