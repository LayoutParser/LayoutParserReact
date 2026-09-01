import { useState } from 'react';
import type { MappingDraftRule, UpdateMappingDraftRuleInput } from '../../types/mappingDraft';

type RuleUpdate = Omit<UpdateMappingDraftRuleInput, 'workspaceId' | 'draftId' | 'ruleId' | 'eTag'>;

interface MappingRuleReviewCardProps {
  rule: MappingDraftRule;
  busy: boolean;
  onUpdate: (rule: MappingDraftRule, update: RuleUpdate) => Promise<void>;
}

type EditMode = 'none' | 'edit' | 'reject';

const statusLabels: Record<MappingDraftRule['status'], string> = {
  proposed: 'Proposta',
  accepted: 'Aceita',
  edited: 'Editada e aceita',
  rejected: 'Rejeitada',
  needs_input: 'Precisa de decisão',
  validated: 'Validada',
  superseded: 'Substituída',
};

const splitReferences = (value: string): string[] =>
  value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

const MappingRuleReviewCard = ({ rule, busy, onUpdate }: MappingRuleReviewCardProps) => {
  const [mode, setMode] = useState<EditMode>('none');
  const [sourceRefs, setSourceRefs] = useState(rule.sourceRefs.join('\n'));
  const [targetRefs, setTargetRefs] = useState(rule.targetRefs.join('\n'));
  const [operation, setOperation] = useState(rule.operation);
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canReview = !['rejected', 'validated', 'superseded'].includes(rule.status);
  const canAccept = rule.status === 'proposed';

  const runUpdate = async (update: RuleUpdate) => {
    setError(null);
    try {
      await onUpdate(rule, update);
      setMode('none');
      setJustification('');
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Não foi possível salvar a decisão desta regra.'
      );
    }
  };

  const submitEdit = () => {
    const normalizedSources = splitReferences(sourceRefs);
    const normalizedTargets = splitReferences(targetRefs);
    if (!operation.trim() || normalizedTargets.length === 0 || !justification.trim()) {
      setError('Informe operação, ao menos um destino e a justificativa da correção.');
      return;
    }
    void runUpdate({
      status: 'edited',
      sourceRefs: normalizedSources,
      targetRefs: normalizedTargets,
      operation: operation.trim(),
      justification: justification.trim(),
    });
  };

  const submitRejection = () => {
    if (!justification.trim()) {
      setError('A justificativa é obrigatória para rejeitar uma regra.');
      return;
    }
    void runUpdate({ status: 'rejected', justification: justification.trim() });
  };

  return (
    <article className="mapping-review-card" data-status={rule.status}>
      <header className="mapping-review-card__header">
        <div>
          <span className="mapping-rule-id">Regra {rule.ruleId}</span>
          <h3>{rule.operation}</h3>
        </div>
        <span className="mapping-status-badge">{statusLabels[rule.status]}</span>
      </header>

      <dl className="mapping-rule-facts">
        <div>
          <dt>Origem</dt>
          <dd>{rule.sourceRefs.length > 0 ? rule.sourceRefs.join(', ') : 'Não declarada'}</dd>
        </div>
        <div>
          <dt>Destino</dt>
          <dd>{rule.targetRefs.length > 0 ? rule.targetRefs.join(', ') : 'Não declarado'}</dd>
        </div>
        <div>
          <dt>Confiança</dt>
          <dd>{rule.confidence}</dd>
        </div>
        <div>
          <dt>Cardinalidade</dt>
          <dd>{rule.cardinality}</dd>
        </div>
      </dl>

      {rule.evidence.length > 0 && (
        <div className="mapping-evidence" aria-label="Evidências da regra">
          <strong>Evidências</strong>
          <ul>
            {rule.evidence.map((evidence, index) => (
              <li key={`${evidence.kind}-${evidence.reference}-${index}`}>
                <span>{evidence.kind}</span>
                <code>{evidence.reference}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rule.questions.length > 0 && (
        <aside className="mapping-open-questions" role="note">
          <strong>A IA precisa de confirmação</strong>
          <ul>
            {rule.questions.map(question => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p>
            A API atual ainda não persiste o texto de uma resposta livre. Corrija a regra de forma
            estruturada ou aguarde o ajuste do contrato antes de responder apenas em texto.
          </p>
        </aside>
      )}

      <details className="mapping-technical-details">
        <summary>Ver condições e transformações</summary>
        <dl>
          <div>
            <dt>Condições</dt>
            <dd>
              <code>{rule.conditions || '[]'}</code>
            </dd>
          </div>
          <div>
            <dt>Transformações</dt>
            <dd>
              <code>{rule.transformations || '[]'}</code>
            </dd>
          </div>
        </dl>
      </details>

      {error && (
        <p className="mapping-inline-error" role="alert">
          {error}
        </p>
      )}

      {canReview && mode === 'none' && (
        <div className="mapping-rule-actions" aria-label={`Decisões para a regra ${rule.ruleId}`}>
          {canAccept && (
            <button
              type="button"
              className="mapping-button mapping-button--primary"
              disabled={busy}
              onClick={() => void runUpdate({ status: 'accepted' })}
            >
              Aceitar proposta
            </button>
          )}
          <button
            type="button"
            className="mapping-button"
            disabled={busy}
            onClick={() => setMode('edit')}
          >
            Corrigir regra
          </button>
          <button
            type="button"
            className="mapping-button mapping-button--danger"
            disabled={busy}
            onClick={() => setMode('reject')}
          >
            Rejeitar
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <form
          className="mapping-rule-form"
          onSubmit={event => {
            event.preventDefault();
            submitEdit();
          }}
        >
          <label>
            Origens, uma por linha
            <textarea
              value={sourceRefs}
              onChange={event => setSourceRefs(event.target.value)}
              rows={3}
            />
          </label>
          <label>
            Destinos, um por linha
            <textarea
              value={targetRefs}
              onChange={event => setTargetRefs(event.target.value)}
              rows={3}
            />
          </label>
          <label>
            Operação
            <input value={operation} onChange={event => setOperation(event.target.value)} />
          </label>
          <label>
            Justificativa da correção
            <textarea
              value={justification}
              onChange={event => setJustification(event.target.value)}
              rows={3}
              required
            />
          </label>
          <div className="mapping-rule-actions">
            <button
              type="submit"
              className="mapping-button mapping-button--primary"
              disabled={busy}
            >
              Salvar correção
            </button>
            <button
              type="button"
              className="mapping-button"
              disabled={busy}
              onClick={() => setMode('none')}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === 'reject' && (
        <form
          className="mapping-rule-form"
          onSubmit={event => {
            event.preventDefault();
            submitRejection();
          }}
        >
          <label>
            Por que esta regra está incorreta?
            <textarea
              value={justification}
              onChange={event => setJustification(event.target.value)}
              rows={3}
              required
            />
          </label>
          <div className="mapping-rule-actions">
            <button type="submit" className="mapping-button mapping-button--danger" disabled={busy}>
              Confirmar rejeição
            </button>
            <button
              type="button"
              className="mapping-button"
              disabled={busy}
              onClick={() => setMode('none')}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </article>
  );
};

export default MappingRuleReviewCard;
