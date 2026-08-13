import type { Field } from '../types/field';

export const POSITIONAL_LINE_LENGTH = 600;

export interface PositionalFieldTarget {
  field: Field;
  fieldIndex: number;
  lineIndex: number;
}

export interface PositionalFieldEditResult {
  content: string;
  field: Field;
  previousValue: string;
  startOffset: number;
  endOffset: number;
}

export type PositionalFieldInspection =
  | {
      editable: true;
      currentValue: string;
      expectedLength: number;
      startOffset: number;
      endOffset: number;
    }
  | { editable: false; reason: string };

const fail = (reason: string): PositionalFieldInspection => ({ editable: false, reason });

/** Localiza a linha física apenas por evidências que não admitem duas ocorrências possíveis. */
export const resolvePositionalLineIndex = (
  content: string,
  lineSequence: string | undefined,
  occurrence: number | undefined,
  fallbackIndex: number,
  totalGroups: number
): number => {
  const normalizedSequence = lineSequence?.trim() ?? '';
  if (/^\d{6}$/.test(normalizedSequence)) {
    const matches: number[] = [];
    for (let lineIndex = 0; lineIndex * POSITIONAL_LINE_LENGTH < content.length; lineIndex += 1) {
      const lineStart = lineIndex * POSITIONAL_LINE_LENGTH;
      if (content.slice(lineStart, lineStart + 6) === normalizedSequence) {
        matches.push(lineIndex);
      }
    }
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return -1;
  }

  if (/^\d{3}$/.test(normalizedSequence)) {
    const matches: number[] = [];
    for (let lineIndex = 0; lineIndex * POSITIONAL_LINE_LENGTH < content.length; lineIndex += 1) {
      const lineStart = lineIndex * POSITIONAL_LINE_LENGTH;
      if (content.slice(lineStart + 6, lineStart + 9) === normalizedSequence) {
        matches.push(lineIndex);
      }
    }

    const occurrenceIndex =
      Number.isInteger(occurrence) && (occurrence ?? 0) > 0 ? occurrence! - 1 : 0;
    if (occurrenceIndex < matches.length) return matches[occurrenceIndex];
    return -1;
  }

  const physicalLineCount = content.length / POSITIONAL_LINE_LENGTH;
  if (
    Number.isInteger(physicalLineCount) &&
    physicalLineCount === totalGroups &&
    fallbackIndex >= 0 &&
    fallbackIndex < physicalLineCount
  ) {
    return fallbackIndex;
  }

  return -1;
};

/**
 * Resolve o intervalo absoluto de um campo sem inferir posição ausente. A edição é fail-closed:
 * se o conteúdo atual não coincidir com o campo parseado, o usuário precisa reprocessar o TXT.
 */
export const inspectPositionalField = (
  content: string,
  target: PositionalFieldTarget
): PositionalFieldInspection => {
  const { field, lineIndex } = target;
  const startPosition = field.startPosition;
  const expectedLength = field.length;

  if (!Number.isInteger(lineIndex) || lineIndex < 0) {
    return fail('A ocorrência física desta linha não pôde ser identificada.');
  }
  if (!Number.isInteger(startPosition) || (startPosition ?? 0) < 1) {
    return fail('A API não informou uma posição inicial válida para este campo.');
  }
  if (!Number.isInteger(expectedLength) || (expectedLength ?? 0) < 1) {
    return fail('A API não informou um comprimento válido para este campo.');
  }

  const zeroBasedPosition = startPosition! - 1;
  if (zeroBasedPosition + expectedLength! > POSITIONAL_LINE_LENGTH) {
    return fail('O intervalo informado pela API ultrapassa o limite de 600 posições da linha.');
  }

  const startOffset = lineIndex * POSITIONAL_LINE_LENGTH + zeroBasedPosition;
  const endOffset = startOffset + expectedLength!;
  if (endOffset > content.length) {
    return fail('O intervalo deste campo está fora do conteúdo TXT atual.');
  }

  const parsedValue = field.value ?? '';
  if (parsedValue.length > expectedLength!) {
    return fail('O valor parseado é maior que o comprimento declarado pela API.');
  }

  const currentValue = content.slice(startOffset, endOffset);
  const expectedCurrentValue = parsedValue.padEnd(expectedLength!, ' ');
  if (currentValue !== expectedCurrentValue) {
    return fail('O TXT mudou desde o processamento. Reprocesse o documento antes de editar.');
  }

  return { editable: true, currentValue, expectedLength: expectedLength!, startOffset, endOffset };
};

export const applyPositionalFieldEdit = (
  content: string,
  target: PositionalFieldTarget,
  nextValue: string
): PositionalFieldEditResult => {
  const inspection = inspectPositionalField(content, target);
  if (!inspection.editable) {
    throw new Error(inspection.reason);
  }
  if (nextValue.length !== inspection.expectedLength) {
    throw new Error('O novo valor deve ter exatamente ' + inspection.expectedLength + ' posições.');
  }
  if (/[\u0000-\u001f\u007f]/.test(nextValue)) {
    throw new Error('O novo valor não pode conter quebras de linha ou caracteres de controle.');
  }

  return {
    content:
      content.slice(0, inspection.startOffset) + nextValue + content.slice(inspection.endOffset),
    field: { ...target.field, value: nextValue },
    previousValue: inspection.currentValue,
    startOffset: inspection.startOffset,
    endOffset: inspection.endOffset,
  };
};
