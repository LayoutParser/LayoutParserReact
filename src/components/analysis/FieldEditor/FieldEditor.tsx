import React, { useId, useMemo, useState } from 'react';

import {
  assertEncodedReplacementSize,
  type DocumentEncoding,
} from '../../../utils/documentEncoding';
import type { PositionalFieldTarget } from '../../../utils/positionalFieldEdit';
import { inspectPositionalField } from '../../../utils/positionalFieldEdit';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import './FieldEditor.css';

interface FieldEditorProps {
  content: string;
  target: PositionalFieldTarget | null;
  encoding?: DocumentEncoding;
  onClose: () => void;
  onSave: (target: PositionalFieldTarget, value: string) => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({
  content,
  target,
  encoding,
  onClose,
  onSave,
}) => {
  const helpId = useId();
  const errorId = useId();
  const inspection = useMemo(
    () => (target ? inspectPositionalField(content, target) : null),
    [content, target]
  );
  const [value, setValue] = useState(() => (inspection?.editable ? inspection.currentValue : ''));
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!target) return null;

  const expectedLength = inspection?.editable ? inspection.expectedLength : 0;
  const isExactLength = value.length === expectedLength;
  const hasControlCharacter = /[\u0000-\u001f\u007f]/.test(value);
  const isUnchanged = inspection?.editable && value === inspection.currentValue;
  let encodingError: string | null = null;
  if (inspection?.editable && encoding && isExactLength) {
    try {
      assertEncodedReplacementSize(inspection.currentValue, value, encoding);
    } catch (error) {
      encodingError =
        error instanceof Error ? error.message : 'O valor não respeita o encoding original.';
    }
  }
  const canSave =
    inspection?.editable && isExactLength && !hasControlCharacter && !encodingError && !isUnchanged;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;

    try {
      onSave(target, value);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível editar o campo.');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Editar ${target.field.fieldName}`} size="medium">
      <form className="field-editor" onSubmit={handleSubmit}>
        <div className="field-editor__metadata" aria-label="Intervalo do campo">
          <span>
            {target.lineIndex >= 0
              ? `Linha física ${target.lineIndex + 1}`
              : 'Linha física não identificada'}
          </span>
          <span>
            Posições {target.field.startPosition ?? 'N/A'}–
            {target.field.startPosition && target.field.length
              ? target.field.startPosition + target.field.length - 1
              : 'N/A'}
          </span>
          <span>{target.field.length ?? 'N/A'} posições</span>
        </div>

        {inspection?.editable ? (
          <>
            <label className="field-editor__label" htmlFor="field-editor-value">
              Novo valor
            </label>
            <input
              id="field-editor-value"
              className={`field-editor__input ${!isExactLength || hasControlCharacter || encodingError ? 'field-editor__input--invalid' : ''}`}
              value={value}
              minLength={expectedLength}
              maxLength={expectedLength}
              onChange={event => {
                setValue(event.target.value);
                setSaveError(null);
              }}
              aria-describedby={`${helpId}${saveError || encodingError ? ` ${errorId}` : ''}`}
              aria-invalid={!isExactLength || hasControlCharacter || Boolean(encodingError)}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="field-editor__length" id={helpId} aria-live="polite">
              <span>
                O valor deve ocupar exatamente {expectedLength} posições; nenhuma posição vizinha
                será deslocada.
              </span>
              <strong className={isExactLength ? 'is-valid' : 'is-invalid'}>
                {value.length}/{expectedLength}
              </strong>
            </div>
            {hasControlCharacter && (
              <p className="field-editor__error" role="alert">
                Quebras de linha e caracteres de controle não são permitidos.
              </p>
            )}
            {encodingError && (
              <p className="field-editor__error" id={errorId} role="alert">
                {encodingError}
              </p>
            )}
          </>
        ) : (
          <p className="field-editor__error" role="alert">
            {inspection?.reason ?? 'Este campo não pode ser editado com segurança.'}
          </p>
        )}

        {saveError && (
          <p className="field-editor__error" id={encodingError ? undefined : errorId} role="alert">
            {saveError}
          </p>
        )}

        <div className="field-editor__actions">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSave}>
            Aplicar no TXT
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FieldEditor;
