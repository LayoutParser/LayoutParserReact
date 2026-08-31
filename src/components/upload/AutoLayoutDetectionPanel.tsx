import type {
  LayoutDetectionCandidate,
  LayoutDetectionResult,
  ParseErrorInfo,
} from '../../types/api';
import ParseErrorBanner from './ParseErrorBanner';
import './AutoLayoutDetectionPanel.css';

export type AutoLayoutDetectionViewState = 'idle' | 'loading' | 'ready' | 'error';

interface AutoLayoutDetectionPanelProps {
  state: AutoLayoutDetectionViewState;
  detection: LayoutDetectionResult | null;
  correlationId?: string;
  error: ParseErrorInfo | null;
  disabled?: boolean;
  onRetry: () => void;
  onUseCandidate: (candidate: LayoutDetectionCandidate) => void;
  onChooseManually: () => void;
}

const MAX_VISIBLE_CANDIDATES = 5;

const formatMatchScore = (score: number): string =>
  `${score.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} / 100`;

const describeSignal = (signal: string): string => {
  const [kind, value = ''] = signal.split(':', 2);
  const descriptions: Record<string, string> = {
    family: `Família do documento compatível: ${value}`,
    record_width: `Cada registro possui ${value} posições`,
    records_matched: `${value} registros reconhecidos pelo layout`,
    declared_markers_observed: `${value} tipos de registro do layout encontrados`,
    marker_order: value === 'consistent' ? 'Ordem dos registros consistente' : signal,
    records_unmatched: `${value} registros não foram reconhecidos`,
    record_width_mismatch: `O tamanho do registro diverge de ${value} posições`,
    layout_without_explicit_markers: 'O layout não declara marcadores de registro',
    minimal_occurrence_excluded_from_authoritative_gate:
      'Ocorrência mínima ainda não participa da prova de compatibilidade',
    cardinality_requires_validated_catalog_metadata:
      'A cardinalidade depende de metadados validados no catálogo',
    layout_family_inferred_from_markers:
      'A família do layout foi inferida pelos marcadores disponíveis',
    mqseries_marker_order_is_informational:
      'No MQSeries, a ordem hierárquica do layout é apenas informativa',
    catalog_incomplete:
      'O catálogo excedeu o limite seguro ou contém layouts que não puderam ser avaliados',
    authoritative_selection_disabled:
      'A seleção automática foi bloqueada até o catálogo estar completo',
  };

  return descriptions[kind] ?? signal.replace(/_/g, ' ');
};

interface CandidateCardProps {
  candidate: LayoutDetectionCandidate;
  disabled: boolean;
  selectable: boolean;
  selected?: boolean;
  onUse: (candidate: LayoutDetectionCandidate) => void;
}

const CandidateCard = ({
  candidate,
  disabled,
  selectable,
  selected = false,
  onUse,
}: CandidateCardProps) => (
  <article
    className={`layout-candidate-card${selected ? ' layout-candidate-card--selected' : ''}`}
    data-rank={candidate.rank}
    aria-current={selected ? 'true' : undefined}
  >
    <div className="layout-candidate-card__heading">
      <div>
        <span className="layout-candidate-card__rank">Opção {candidate.rank}</span>
        <h4>{candidate.name}</h4>
      </div>
      <div className="layout-candidate-card__score">
        <strong>{formatMatchScore(candidate.matchScore)}</strong>
        <span>índice de equivalência</span>
      </div>
    </div>

    {selected && <span className="layout-candidate-card__selected">Layout em uso</span>}

    {candidate.isTied && (
      <p className="layout-candidate-card__tie">
        Empate técnico: a posição exibida não torna este layout mais confiável.
      </p>
    )}

    {candidate.evidence.length > 0 && (
      <div className="layout-candidate-card__detail">
        <strong>Evidências</strong>
        <ul>
          {candidate.evidence.map((item, index) => (
            <li key={`${candidate.layoutGuid}-evidence-${index}`}>{describeSignal(item)}</li>
          ))}
        </ul>
      </div>
    )}

    {candidate.conflicts.length > 0 && (
      <div className="layout-candidate-card__detail layout-candidate-card__detail--conflict">
        <strong>Diferenças encontradas</strong>
        <ul>
          {candidate.conflicts.map((item, index) => (
            <li key={`${candidate.layoutGuid}-conflict-${index}`}>{describeSignal(item)}</li>
          ))}
        </ul>
      </div>
    )}

    {candidate.limitations.length > 0 && (
      <div className="layout-candidate-card__detail">
        <strong>Limitações da comparação</strong>
        <ul>
          {candidate.limitations.map((item, index) => (
            <li key={`${candidate.layoutGuid}-limitation-${index}`}>{describeSignal(item)}</li>
          ))}
        </ul>
      </div>
    )}

    {selectable && (
      <button
        type="button"
        className="layout-candidate-card__action"
        disabled={disabled || selected}
        onClick={() => onUse(candidate)}
      >
        {selected ? 'Layout em uso' : 'Usar este layout'}
      </button>
    )}
  </article>
);

const AutoLayoutDetectionPanel = ({
  state,
  detection,
  correlationId,
  error,
  disabled = false,
  onRetry,
  onUseCandidate,
  onChooseManually,
}: AutoLayoutDetectionPanelProps) => {
  if (state === 'idle') return null;

  if (state === 'loading') {
    return (
      <section
        className="auto-layout-detection auto-layout-detection--loading"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="auto-layout-detection__spinner" aria-hidden="true" />
        <div>
          <h3>Analisando equivalência do layout</h3>
          <p>A API está comparando a estrutura do documento com o catálogo disponível.</p>
        </div>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="auto-layout-detection" aria-labelledby="auto-layout-error-title">
        <h3 id="auto-layout-error-title">Não foi possível concluir a identificação</h3>
        {error && <ParseErrorBanner error={error} />}
        <div className="auto-layout-detection__actions">
          <button type="button" disabled={disabled} onClick={onRetry}>
            Tentar novamente
          </button>
          <button type="button" disabled={disabled} onClick={onChooseManually}>
            Escolher layout manualmente
          </button>
        </div>
      </section>
    );
  }

  if (!detection) return null;

  const candidates = [...detection.candidates]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, MAX_VISIBLE_CANDIDATES);
  const suggestions = [...(detection.suggestedCandidates ?? [])]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, MAX_VISIBLE_CANDIDATES);
  const uniqueLayout = detection.selectedLayout;

  return (
    <section
      className={`auto-layout-detection auto-layout-detection--${detection.status}`}
      aria-labelledby="auto-layout-detection-title"
    >
      <div className="auto-layout-detection__header">
        <div>
          <span className="auto-layout-detection__eyebrow">Detecção automática</span>
          <h3 id="auto-layout-detection-title">
            {detection.status === 'unique' && 'Layout identificado'}
            {detection.status === 'ambiguous' &&
              (detection.selectedLayout
                ? 'Layout escolhido entre os equivalentes'
                : 'Escolha entre os layouts equivalentes')}
            {detection.status === 'not_found' && 'Nenhum layout compatível foi confirmado'}
          </h3>
        </div>
        {detection.detectedType && (
          <span className="auto-layout-detection__type">{detection.detectedType}</span>
        )}
      </div>

      <div className="auto-layout-detection__announcement" role="status" aria-live="polite">
        {detection.status === 'unique' && uniqueLayout && (
          <p>
            <strong>{uniqueLayout.name}</strong> foi provado pela API e aplicado ao documento.
          </p>
        )}
        {detection.status === 'ambiguous' && !detection.selectedLayout && (
          <p>
            Mais de um layout permanece compatível. A equivalência ajuda na comparação, mas não é
            uma medida de confiança. Nenhuma opção foi pré-selecionada.
          </p>
        )}
        {detection.status === 'ambiguous' && detection.selectedLayout && (
          <p>
            <strong>{detection.selectedLayout.name}</strong> foi escolhido explicitamente e está
            vinculado ao resultado atual. Você ainda pode comparar e trocar para outra opção.
          </p>
        )}
        {detection.status === 'not_found' && (
          <p>
            A estrutura não comprovou compatibilidade. Use o catálogo manual; sugestões abaixo,
            quando existirem, são apenas aproximações não confirmadas.
          </p>
        )}
      </div>

      {detection.status === 'unique' && uniqueLayout && (
        <div className="auto-layout-detection__unique">
          <strong>{uniqueLayout.name}</strong>
          <span>
            Índice de equivalência estrutural: {formatMatchScore(uniqueLayout.matchScore)}
          </span>
        </div>
      )}

      {detection.status === 'ambiguous' && (
        <div className="auto-layout-detection__candidate-list" aria-label="Layouts equivalentes">
          {candidates.map(candidate => (
            <CandidateCard
              key={candidate.layoutGuid}
              candidate={candidate}
              disabled={disabled}
              selectable
              selected={candidate.layoutGuid === detection.selectedLayout?.layoutGuid}
              onUse={onUseCandidate}
            />
          ))}
        </div>
      )}

      {detection.status === 'not_found' && suggestions.length > 0 && (
        <div>
          <h4 className="auto-layout-detection__suggestions-title">
            Sugestões aproximadas — não confirmadas
          </h4>
          <div
            className="auto-layout-detection__candidate-list"
            aria-label="Sugestões de layouts não confirmadas"
          >
            {suggestions.map(candidate => (
              <CandidateCard
                key={candidate.layoutGuid}
                candidate={candidate}
                disabled={disabled}
                selectable={false}
                onUse={onUseCandidate}
              />
            ))}
          </div>
        </div>
      )}

      {detection.status !== 'not_found' &&
        (detection.truncated || detection.totalCandidates > candidates.length) && (
          <p className="auto-layout-detection__truncation">
            Exibindo até {MAX_VISIBLE_CANDIDATES} de {detection.totalCandidates} alternativas
            avaliadas pela API.
          </p>
        )}
      {detection.status === 'not_found' && detection.truncated && (
        <p className="auto-layout-detection__truncation">
          A API limitou as sugestões aproximadas às {MAX_VISIBLE_CANDIDATES} primeiras.
        </p>
      )}

      <dl className="auto-layout-detection__metadata">
        <div>
          <dt>Algoritmo</dt>
          <dd>{detection.algorithmVersion}</dd>
        </div>
        <div>
          <dt>Catálogo</dt>
          <dd>{detection.catalogVersion}</dd>
        </div>
        {correlationId && (
          <div>
            <dt>Correlation ID</dt>
            <dd>{correlationId}</dd>
          </div>
        )}
      </dl>

      {detection.status !== 'unique' && (
        <div className="auto-layout-detection__actions">
          <button type="button" disabled={disabled} onClick={onChooseManually}>
            Escolher layout manualmente
          </button>
        </div>
      )}
    </section>
  );
};

export default AutoLayoutDetectionPanel;
