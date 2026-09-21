import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mappingDraftService } from '../../services/api/mappingDraftService';
import type { MappingDraftRule } from '../../types/mappingDraft';
import MappingRuleReviewCard from './MappingRuleReviewCard';

vi.mock('../../services/api/mappingDraftService', async importOriginal => {
  const original = await importOriginal<typeof import('../../services/api/mappingDraftService')>();
  return {
    ...original,
    mappingDraftService: {
      answerRuleQuestion: vi.fn(),
      listRuleQuestionAnswers: vi.fn(),
    },
  };
});

const rule: MappingDraftRule = {
  ruleId: 'rule-1',
  draftId: 'draft-1',
  sourceRefs: ['layout://LINHA004/CNPJ'],
  targetRefs: ['xsd:///NFe/infNFe/emit/CNPJ'],
  operation: 'copy',
  conditions: '[]',
  transformations: '[]',
  cardinality: '1:1',
  evidence: [],
  confidence: 'medium',
  status: 'needs_input',
  questions: ['O campo LINHA004/CNPJ representa sempre o emitente?'],
  createdAt: '2026-08-31T19:00:00Z',
  eTag: 'AAAAAAAAAAE=',
};

describe('MappingRuleReviewCard — perguntas abertas (gap a2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carrega o histórico e envia uma nova resposta pelo PUT dedicado', async () => {
    vi.mocked(mappingDraftService.listRuleQuestionAnswers).mockResolvedValue([]);
    vi.mocked(mappingDraftService.answerRuleQuestion).mockResolvedValue({
      questionIndex: 0,
      questionSnapshot: 'O campo LINHA004/CNPJ representa sempre o emitente?',
      answer: 'Sim, sempre o emitente para NF-e modelo 55.',
      answeredBy: 'user-1',
      answeredAt: '2026-09-16T10:00:00Z',
      version: 1,
    });

    render(
      <MappingRuleReviewCard
        workspaceId="workspace-1"
        draftId="draft-1"
        rule={rule}
        busy={false}
        onUpdate={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(mappingDraftService.listRuleQuestionAnswers).toHaveBeenCalledWith(
        'workspace-1',
        'draft-1',
        'rule-1',
        { includeHistory: true }
      )
    );

    const textarea = screen.getByLabelText('Responder');
    fireEvent.change(textarea, {
      target: { value: 'Sim, sempre o emitente para NF-e modelo 55.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));

    await waitFor(() =>
      expect(mappingDraftService.answerRuleQuestion).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        draftId: 'draft-1',
        ruleId: 'rule-1',
        questionIndex: 0,
        answer: 'Sim, sempre o emitente para NF-e modelo 55.',
      })
    );

    expect(await screen.findByText('Resposta atual (v1)')).toBeVisible();
    expect(screen.getByText('Sim, sempre o emitente para NF-e modelo 55.')).toBeVisible();
  });

  it('exibe o histórico de respostas anteriores quando a API já retorna versões', async () => {
    vi.mocked(mappingDraftService.listRuleQuestionAnswers).mockResolvedValue([
      {
        questionIndex: 0,
        questionSnapshot: 'O campo LINHA004/CNPJ representa sempre o emitente?',
        answer: 'Resposta antiga.',
        answeredBy: 'user-1',
        answeredAt: '2026-09-10T10:00:00Z',
        version: 1,
      },
      {
        questionIndex: 0,
        questionSnapshot: 'O campo LINHA004/CNPJ representa sempre o emitente?',
        answer: 'Resposta corrigida.',
        answeredBy: 'user-2',
        answeredAt: '2026-09-16T10:00:00Z',
        version: 2,
      },
    ]);

    render(
      <MappingRuleReviewCard
        workspaceId="workspace-1"
        draftId="draft-1"
        rule={rule}
        busy={false}
        onUpdate={vi.fn()}
      />
    );

    expect(await screen.findByText('Resposta atual (v2)')).toBeVisible();
    expect(screen.getByText('Resposta corrigida.')).toBeVisible();
    fireEvent.click(screen.getByText(/Histórico de respostas/));
    expect(screen.getByText('Resposta antiga.')).toBeVisible();
  });

  it('bloqueia envio de resposta vazia sem chamar a API', async () => {
    vi.mocked(mappingDraftService.listRuleQuestionAnswers).mockResolvedValue([]);

    render(
      <MappingRuleReviewCard
        workspaceId="workspace-1"
        draftId="draft-1"
        rule={rule}
        busy={false}
        onUpdate={vi.fn()}
      />
    );

    await waitFor(() => expect(mappingDraftService.listRuleQuestionAnswers).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));

    expect(screen.getByText('Informe uma resposta antes de enviar.')).toBeVisible();
    expect(mappingDraftService.answerRuleQuestion).not.toHaveBeenCalled();
  });
});
