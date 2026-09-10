import React, { useId, useRef, useState } from 'react';
import Modal from '../shared/Modal';
import type { FieldCorrectionReport } from '../../types/fieldCorrection';
import './FieldDivergenceModal.css';

export interface FieldDivergenceFormValues {
  expectedValue: string;
  justification: string;
}

interface FieldDivergenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Xpath do campo (somente leitura, vem do nó selecionado na árvore). */
  fieldPath: string;
  /** Valor observado no XML transformado (somente leitura). */
  observedValue: string;
  pathwayLabel: string;
  candidateId: string;
  correlationId: string | null;
  /** Reporte já existente para este nó+candidato — presente = formulário abre em modo edição. */
  existingReport: FieldCorrectionReport | null;
  onSubmit: (values: FieldDivergenceFormValues) => void;
}

/**
 * Formulário estruturado para reportar (ou editar) a divergência de valor de um campo específico
 * da transformação XML (Story #234). Reaproveita `components/shared/Modal` — não cria modal do
 * zero. Nesta entrega o envio só grava estado local (ver `useFieldCorrectionStore`); não há
 * chamada HTTP de escrita porque o endpoint de persistência ainda não existe na API.
 */
const FieldDivergenceModal: React.FC<FieldDivergenceModalProps> = ({
  isOpen,
  onClose,
  fieldPath,
  observedValue,
  pathwayLabel,
  candidateId,
  correlationId,
  existingReport,
  onSubmit,
}) => {
  const [expectedValue, setExpectedValue] = useState('');
  const [justification, setJustification] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previousIsOpen, setPreviousIsOpen] = useState(false);
  const expectedValueRef = useRef<HTMLTextAreaElement>(null);
  const expectedValueErrorId = useId();

  // Reidrata os campos editáveis quando o formulário transiciona para aberto — seja para um nó
  // novo (vazio) ou para editar um reporte já existente (pré-preenchido, critério de aceite 6).
  // Ajuste de estado durante o render (em vez de `useEffect`): projeto bloqueia
  // `react-hooks/set-state-in-effect` como erro de lint.
  if (isOpen && !previousIsOpen) {
    setPreviousIsOpen(true);
    setExpectedValue(existingReport?.expectedValue ?? '');
    setJustification(existingReport?.justification ?? '');
    setValidationError(null);
  } else if (!isOpen && previousIsOpen) {
    setPreviousIsOpen(false);
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedExpectedValue = expectedValue.trim();

    if (!trimmedExpectedValue) {
      setValidationError('Informe o valor esperado para reportar a divergência.');
      requestAnimationFrame(() => expectedValueRef.current?.focus());
      return;
    }

    onSubmit({ expectedValue: trimmedExpectedValue, justification: justification.trim() });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingReport ? 'Editar divergência de campo' : 'Reportar divergência de campo'}
      size="medium"
    >
      <form className="field-divergence-form" onSubmit={handleSubmit} noValidate>
        <dl className="field-divergence-readonly">
          <div className="field-divergence-readonly-row">
            <dt>Campo (xpath)</dt>
            <dd>{fieldPath}</dd>
          </div>
          <div className="field-divergence-readonly-row">
            <dt>Valor observado</dt>
            <dd>{observedValue || '(vazio)'}</dd>
          </div>
          <div className="field-divergence-readonly-row">
            <dt>Caminho de transformação</dt>
            <dd>
              {pathwayLabel} — <span className="field-divergence-candidate-id">{candidateId}</span>
            </dd>
          </div>
          {correlationId && (
            <div className="field-divergence-readonly-row">
              <dt>Correlation ID</dt>
              <dd>{correlationId}</dd>
            </div>
          )}
        </dl>

        <div className="field-divergence-field">
          <label htmlFor="field-divergence-expected-value">
            Valor esperado <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="field-divergence-expected-value"
            ref={expectedValueRef}
            value={expectedValue}
            onChange={event => {
              setExpectedValue(event.target.value);
              if (validationError) setValidationError(null);
            }}
            aria-required="true"
            aria-invalid={validationError ? true : undefined}
            aria-describedby={validationError ? expectedValueErrorId : undefined}
            rows={2}
          />
          {validationError && (
            <p id={expectedValueErrorId} className="field-divergence-error" role="alert">
              {validationError}
            </p>
          )}
        </div>

        <div className="field-divergence-field">
          <label htmlFor="field-divergence-justification">Justificativa (opcional)</label>
          <textarea
            id="field-divergence-justification"
            value={justification}
            onChange={event => setJustification(event.target.value)}
            rows={3}
          />
        </div>

        <div className="field-divergence-actions">
          <button type="button" className="field-divergence-cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="field-divergence-submit-btn">
            {existingReport ? 'Atualizar reporte' : 'Registrar divergência'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FieldDivergenceModal;
