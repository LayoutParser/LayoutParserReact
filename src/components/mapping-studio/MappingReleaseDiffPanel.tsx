import React, { useState } from 'react';
import {
  MappingReleaseRequestError,
  mappingReleaseService,
} from '../../services/api/mappingReleaseService';
import type { MappingReleaseDiff } from '../../types/mappingRelease';

interface MappingReleaseDiffPanelProps {
  workspaceId: string;
  draftId: string;
}

/**
 * Diff A×B entre duas releases do mesmo draft (issue #228). Consome
 * `mappingReleaseService.getReleasesDiff`. O shape de `MappingReleaseDiff` NÃO foi confirmado
 * contra a API real (ver [[project_fiscal_contract_drift_2026_09_15]]) — renderiza de forma
 * defensiva, sem assumir campos além dos já tipados.
 */
const MappingReleaseDiffPanel = ({ workspaceId, draftId }: MappingReleaseDiffPanelProps) => {
  const [fromReleaseId, setFromReleaseId] = useState('');
  const [toReleaseId, setToReleaseId] = useState('');
  const [diff, setDiff] = useState<MappingReleaseDiff | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fromReleaseId.trim() || !toReleaseId.trim()) {
      setError('Informe as duas releases (origem e destino) para comparar.');
      return;
    }
    setBusy(true);
    setError(null);
    setDiff(null);
    try {
      const result = await mappingReleaseService.getReleasesDiff(
        workspaceId,
        draftId,
        fromReleaseId.trim(),
        toReleaseId.trim()
      );
      setDiff(result);
    } catch (diffError) {
      setError(
        diffError instanceof MappingReleaseRequestError
          ? diffError.message
          : diffError instanceof Error
            ? diffError.message
            : 'Não foi possível calcular o diff entre as releases.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mapping-studio-section" aria-labelledby="mapping-release-diff-title">
      <div className="mapping-section-heading">
        <div>
          <p className="mapping-kicker">Issue #228</p>
          <h2 id="mapping-release-diff-title">Diff A×B entre releases</h2>
          <p>
            Compara duas releases do mesmo draft e mostra as mudanças agregadas por elemento de
            schema. Shape ainda não confirmado contra a API — tratado de forma genérica.
          </p>
        </div>
      </div>

      <form className="mapping-rule-form" onSubmit={event => void handleSubmit(event)}>
        <label htmlFor="release-diff-from">
          Release de origem (A)
          <input
            id="release-diff-from"
            value={fromReleaseId}
            onChange={event => setFromReleaseId(event.target.value)}
            placeholder="releaseId"
            required
          />
        </label>
        <label htmlFor="release-diff-to">
          Release de destino (B)
          <input
            id="release-diff-to"
            value={toReleaseId}
            onChange={event => setToReleaseId(event.target.value)}
            placeholder="releaseId"
            required
          />
        </label>
        {error && (
          <p className="mapping-inline-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="mapping-button mapping-button--primary" disabled={busy}>
          {busy ? 'Comparando…' : 'Comparar releases'}
        </button>
      </form>

      {diff && (diff.changes ?? []).length === 0 && (
        <p className="mapping-job-status" role="status">
          Nenhuma mudança encontrada entre {diff.fromReleaseId} e {diff.toReleaseId}.
        </p>
      )}

      {diff && (diff.changes ?? []).length > 0 && (
        <ul className="mapping-review-list" aria-label="Mudanças por elemento de schema">
          {(diff.changes ?? []).map((change, index) => (
            <li key={`${change.element}-${index}`}>
              <strong>{change.element}</strong> — {change.changeKind}
              <dl className="mapping-rule-facts">
                <div>
                  <dt>De</dt>
                  <dd>{change.fromValue ?? 'ausente'}</dd>
                </div>
                <div>
                  <dt>Para</dt>
                  <dd>{change.toValue ?? 'ausente'}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MappingReleaseDiffPanel;
