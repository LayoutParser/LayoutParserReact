import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mappingReleaseService } from '../../services/api/mappingReleaseService';
import type { MappingGovernanceSnapshot, MappingRelease } from '../../types/mappingRelease';
import MappingGovernanceReadiness from './MappingGovernanceReadiness';

vi.mock('../../services/api/mappingReleaseService', () => ({
  mappingReleaseService: {
    approveRelease: vi.fn(),
    publishRelease: vi.fn(),
    rollbackRelease: vi.fn(),
  },
}));

const passedSummary = {
  passed: 2,
  failed: 0,
  coveragePercent: 100,
  requiredGatesPassed: true,
  xsdValid: true,
  xsdErrors: [],
  divergences: [],
};

const release: MappingRelease = {
  releaseId: 'release-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  engine: 'xslt',
  artifacts: [],
  sourceRuleIds: ['rule-1'],
  compileDiagnostics: [],
  rulesSnapshotHash: 'snapshot-hash',
  testRunSummary: null,
  status: 'draft_compiled',
  correlationId: 'correlation-1',
  createdAt: '2026-09-01T01:00:00Z',
  eTag: 'AAAAAAAAAAE=',
  environment: null,
  approvedByUserId: null,
  approvedAt: null,
  approvalJustification: null,
  publishedByUserId: null,
  publishedAt: null,
  previousPublishedReleaseId: null,
};

const snapshot = (status: MappingGovernanceSnapshot['status']): MappingGovernanceSnapshot => ({
  releaseId: 'release-1',
  workspaceId: 'workspace-1',
  draftId: 'draft-1',
  engine: 'xslt',
  status,
  environment: status === 'published' ? 'production' : 'development',
  approvedByUserId: 'reviewer-1',
  approvedAt: '2026-09-01T10:00:00Z',
  approvalJustification: 'Revisão fiscal concluída.',
  publishedByUserId: ['published', 'deprecated'].includes(status) ? 'admin-1' : null,
  publishedAt: ['published', 'deprecated'].includes(status) ? '2026-09-01T10:05:00Z' : null,
  previousPublishedReleaseId: ['published', 'deprecated'].includes(status) ? 'release-0' : null,
  correlationId: 'correlation-1',
  eTag: 'AAAAAAAAAAI=',
});

describe('MappingGovernanceReadiness', () => {
  beforeEach(() => vi.clearAllMocks());

  it('representa a etapa atual de forma visual e acessível', () => {
    render(
      <MappingGovernanceReadiness
        workspaceId="workspace-1"
        workspaceRole="fiscal_admin"
        release={release}
        onReleaseChange={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Revisão, publicação e rollback' })).toBeVisible();
    expect(screen.getByText('Aguardando Test Lab')).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Draft técnico');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('aprova uma release testada com justificativa obrigatória', async () => {
    const onReleaseChange = vi.fn();
    vi.mocked(mappingReleaseService.approveRelease).mockResolvedValue(snapshot('approved'));
    render(
      <MappingGovernanceReadiness
        workspaceId="workspace-1"
        workspaceRole="fiscal_admin"
        release={{ ...release, status: 'test_passed', testRunSummary: passedSummary }}
        onReleaseChange={onReleaseChange}
      />
    );

    const approveButton = screen.getByRole('button', { name: 'Aprovar release' });
    expect(approveButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Justificativa da revisão'), {
      target: { value: 'Revisão fiscal concluída.' },
    });
    fireEvent.click(approveButton);

    await waitFor(() =>
      expect(mappingReleaseService.approveRelease).toHaveBeenCalledWith(
        'workspace-1',
        'release-1',
        'Revisão fiscal concluída.'
      )
    );
    expect(onReleaseChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved', approvedByUserId: 'reviewer-1' })
    );
  });

  it('não oferece aprovação para papel sem autorização', () => {
    render(
      <MappingGovernanceReadiness
        workspaceId="workspace-1"
        workspaceRole="owner"
        release={{ ...release, status: 'test_passed', testRunSummary: passedSummary }}
        onReleaseChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Aprovar release' })).not.toBeInTheDocument();
    expect(screen.getByText(/Seu papel atual \(Owner\) não aprova releases/i)).toBeVisible();
  });

  it('publica uma release aprovada no ambiente escolhido', async () => {
    vi.mocked(mappingReleaseService.publishRelease).mockResolvedValue(snapshot('published'));
    const onReleaseChange = vi.fn();
    render(
      <MappingGovernanceReadiness
        workspaceId="workspace-1"
        workspaceRole="fiscal_admin"
        release={{
          ...release,
          status: 'approved',
          testRunSummary: passedSummary,
          environment: 'development',
        }}
        onReleaseChange={onReleaseChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Ambiente de ativação'), {
      target: { value: 'production' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar release' }));

    await waitFor(() =>
      expect(mappingReleaseService.publishRelease).toHaveBeenCalledWith(
        'workspace-1',
        'release-1',
        'production'
      )
    );
    expect(onReleaseChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
  });

  it('executa rollback da publicação e preserva a resposta idempotente da API', async () => {
    vi.mocked(mappingReleaseService.rollbackRelease).mockResolvedValue(snapshot('deprecated'));
    const onReleaseChange = vi.fn();
    render(
      <MappingGovernanceReadiness
        workspaceId="workspace-1"
        workspaceRole="owner"
        release={{
          ...release,
          status: 'published',
          testRunSummary: passedSummary,
          environment: 'production',
          previousPublishedReleaseId: 'release-0',
        }}
        onReleaseChange={onReleaseChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reverter para a versão anterior' }));

    await waitFor(() =>
      expect(mappingReleaseService.rollbackRelease).toHaveBeenCalledWith('workspace-1', 'release-1')
    );
    expect(onReleaseChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'deprecated' }));
  });
});
