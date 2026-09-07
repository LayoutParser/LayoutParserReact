import { diffLines } from '../../../utils/lineDiff';
import type { MappingReleaseArtifact } from '../../../types/mappingRelease';
import './MappingArtifactDiffView.css';

interface MappingArtifactDiffViewProps {
  /** Artefato de referência (ex.: release anterior publicada). `null` quando ainda carregando ou indisponível. */
  baseline: MappingReleaseArtifact | null;
  /** Artefato atual (ex.: draft compilado ou release em revisão). */
  current: MappingReleaseArtifact;
  baselineLabel: string;
  currentLabel: string;
  loading?: boolean;
  error?: string | null;
  /** IDs de `MappingDraftRule` que compõem o snapshot da release de referência (`null` se indisponível). */
  baselineSourceRuleIds?: string[] | null;
  /** IDs de `MappingDraftRule` que compõem o snapshot da release atual. */
  currentSourceRuleIds?: string[] | null;
}

/**
 * Diff textual lado a lado entre dois artefatos TCL/XSL/XSLT compilados. Puramente
 * apresentacional: quem chama decide quais dois artefatos comparar e busca o conteúdo.
 */
const MappingArtifactDiffView = ({
  baseline,
  current,
  baselineLabel,
  currentLabel,
  loading = false,
  error = null,
  baselineSourceRuleIds = null,
  currentSourceRuleIds = null,
}: MappingArtifactDiffViewProps) => {
  if (loading) {
    return (
      <div
        className="mapping-diff-view mapping-diff-view--state"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="mapping-loader" aria-hidden="true" />
        <p>Carregando artefato para comparação…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mapping-diff-view mapping-diff-view--state" role="alert">
        <p className="mapping-page-error">{error}</p>
      </div>
    );
  }

  if (!baseline) {
    return (
      <div className="mapping-empty-state mapping-diff-view--empty">
        <h3>Nenhum artefato de referência</h3>
        <p>Não há uma versão anterior publicada deste engine para comparar.</p>
      </div>
    );
  }

  if (baseline.kind !== current.kind) {
    return (
      <div className="mapping-diff-view mapping-diff-view--state" role="alert">
        <p className="mapping-page-error">
          Os artefatos comparados são de tipos diferentes ({baseline.kind} vs. {current.kind}) e não
          podem ser exibidos como diff textual.
        </p>
      </div>
    );
  }

  const ops = diffLines(baseline.content, current.content);
  const hasChanges = ops.some(op => op.type !== 'unchanged');

  const addedRuleIds =
    baselineSourceRuleIds && currentSourceRuleIds
      ? currentSourceRuleIds.filter(ruleId => !baselineSourceRuleIds.includes(ruleId))
      : [];
  const removedRuleIds =
    baselineSourceRuleIds && currentSourceRuleIds
      ? baselineSourceRuleIds.filter(ruleId => !currentSourceRuleIds.includes(ruleId))
      : [];
  const hasRuleLinkageData = Boolean(baselineSourceRuleIds && currentSourceRuleIds);

  return (
    <section className="mapping-diff-view" aria-label={`Diff do artefato ${current.kind}`}>
      <header className="mapping-diff-view__header">
        <div>
          <span className="mapping-rule-id">{baselineLabel}</span>
          <code>{baseline.hash}</code>
        </div>
        <span aria-hidden="true">→</span>
        <div>
          <span className="mapping-rule-id">{currentLabel}</span>
          <code>{current.hash}</code>
        </div>
      </header>

      {hasRuleLinkageData && (
        <aside
          className="mapping-diff-view__rule-linkage"
          aria-label="Regras vinculadas ao snapshot"
        >
          {addedRuleIds.length === 0 && removedRuleIds.length === 0 ? (
            <p role="status">
              Mesmo conjunto de {currentSourceRuleIds?.length ?? 0} regra(s) fonte entre as duas
              releases; a diferença acima vem apenas de recompilação/edição do artefato.
            </p>
          ) : (
            <>
              {addedRuleIds.length > 0 && (
                <p>
                  Regras incluídas nesta release: <code>{addedRuleIds.join(', ')}</code>
                </p>
              )}
              {removedRuleIds.length > 0 && (
                <p>
                  Regras que saíram do snapshot: <code>{removedRuleIds.join(', ')}</code>
                </p>
              )}
            </>
          )}
        </aside>
      )}

      {!hasChanges ? (
        <p className="mapping-diff-view__unchanged" role="status">
          Nenhuma diferença de conteúdo entre os dois artefatos.
        </p>
      ) : (
        <div className="mapping-diff-view__grid" role="table" aria-label="Linhas comparadas">
          {ops.map((op, index) => (
            <div
              key={`${op.type}-${op.oldLineNumber ?? '-'}-${op.newLineNumber ?? '-'}-${index}`}
              className={`mapping-diff-row mapping-diff-row--${op.type}`}
              role="row"
            >
              <span className="mapping-diff-row__line-number" aria-hidden="true">
                {op.oldLineNumber ?? ''}
              </span>
              <span className="mapping-diff-row__line-number" aria-hidden="true">
                {op.newLineNumber ?? ''}
              </span>
              <span className="mapping-diff-row__marker" aria-hidden="true">
                {op.type === 'added' ? '+' : op.type === 'removed' ? '-' : ' '}
              </span>
              <code className="mapping-diff-row__content">
                {op.value.length > 0 ? op.value : ' '}
              </code>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default MappingArtifactDiffView;
