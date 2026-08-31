import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LayoutDetectionCandidate, LayoutDetectionResult } from '../../types/api';
import AutoLayoutDetectionPanel from './AutoLayoutDetectionPanel';

const candidate = (
  rank: number,
  name: string,
  overrides: Partial<LayoutDetectionCandidate> = {}
): LayoutDetectionCandidate => ({
  rank,
  layoutGuid: `layout-${rank}`,
  name,
  matchScore: 100 - rank,
  isTied: false,
  evidence: [`Evidência ${rank}`],
  conflicts: [],
  limitations: [],
  ...overrides,
});

const detection = (
  status: LayoutDetectionResult['status'],
  overrides: Partial<LayoutDetectionResult> = {}
): LayoutDetectionResult => ({
  status,
  detectedType: 'mqseries',
  algorithmVersion: 'fingerprint-v1',
  catalogVersion: 'catalog-10',
  totalCandidates: 0,
  truncated: false,
  candidates: [],
  ...overrides,
});

const baseProps = {
  correlationId: 'corr-auto-1',
  error: null,
  disabled: false,
  onRetry: vi.fn(),
  onUseCandidate: vi.fn(),
  onChooseManually: vi.fn(),
};

describe('AutoLayoutDetectionPanel', () => {
  it('anuncia o carregamento como uma região ocupada', () => {
    const { container } = render(
      <AutoLayoutDetectionPanel {...baseProps} state="loading" detection={null} />
    );

    expect(screen.getByText('Analisando equivalência do layout')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('ordena os candidatos pela posição da API sem pré-selecionar e envia a escolha explícita', () => {
    const onUseCandidate = vi.fn();
    const first = candidate(1, 'Layout Fiat A', { matchScore: 97.5 });
    const second = candidate(2, 'Layout Fiat B', { isTied: true });
    render(
      <AutoLayoutDetectionPanel
        {...baseProps}
        state="ready"
        detection={detection('ambiguous', {
          totalCandidates: 2,
          candidates: [second, first],
        })}
        onUseCandidate={onUseCandidate}
      />
    );

    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings.map(heading => heading.textContent)).toEqual([
      'Layout Fiat A',
      'Layout Fiat B',
    ]);
    expect(screen.getByText('97,5 / 100')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma opção foi pré-selecionada/)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Usar este layout' })[1]);
    expect(onUseCandidate).toHaveBeenCalledWith(second);
  });

  it('diferencia sugestões não confirmadas e não oferece aplicação direta', () => {
    render(
      <AutoLayoutDetectionPanel
        {...baseProps}
        state="ready"
        detection={detection('not_found', {
          totalCandidates: 1,
          suggestedCandidates: [candidate(1, 'Layout aproximado')],
        })}
      />
    );

    expect(screen.getByText('Sugestões aproximadas — não confirmadas')).toBeInTheDocument();
    expect(screen.getByText('Layout aproximado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar este layout' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher layout manualmente' })).toBeEnabled();
  });

  it('preserva o correlation id do resultado único', () => {
    const selectedLayout = candidate(1, 'Layout provado', { matchScore: 100 });
    render(
      <AutoLayoutDetectionPanel
        {...baseProps}
        state="ready"
        detection={detection('unique', { selectedLayout, candidates: [selectedLayout] })}
      />
    );

    expect(screen.getByText(/foi provado pela API/)).toBeInTheDocument();
    expect(screen.getByText('corr-auto-1')).toBeInTheDocument();
  });

  it('mantém auditável a escolha feita entre candidatos equivalentes', () => {
    const selectedLayout = candidate(2, 'Layout escolhido');
    render(
      <AutoLayoutDetectionPanel
        {...baseProps}
        state="ready"
        detection={detection('ambiguous', {
          totalCandidates: 2,
          selectedLayout,
          candidates: [candidate(1, 'Outra opção'), selectedLayout],
        })}
      />
    );

    expect(screen.getByText('Layout escolhido entre os equivalentes')).toBeInTheDocument();
    expect(screen.getByText(/foi escolhido explicitamente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Layout em uso' })).toBeDisabled();
    expect(screen.getByText('Layout em uso', { selector: 'span' })).toBeInTheDocument();
  });

  it('expõe retry por botão focável quando a detecção falha', () => {
    const onRetry = vi.fn();
    render(
      <AutoLayoutDetectionPanel
        {...baseProps}
        state="error"
        detection={null}
        error={{ kind: 'network_error', message: 'API indisponível.', correlationId: 'corr-fail' }}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByText('corr-fail')).toBeInTheDocument();
  });
});
