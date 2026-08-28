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
  lineName: string | undefined,
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

    // O sequencial de seis dígitos não é necessariamente único. No MQSeries real, por
    // exemplo, LINHA000 e LINHA001 podem começar ambas com `000001`. Desambiguar pelo código
    // estrutural de três dígitos da linha (posições 7–9) mantém a resolução determinística.
    if (matches.length > 1) {
      const lineCode = lineName
        ?.match(/(\d+)$/)?.[1]
        ?.slice(-3)
        .padStart(3, '0');
      if (lineCode) {
        const structuralMatches = matches.filter(lineIndex => {
          const lineStart = lineIndex * POSITIONAL_LINE_LENGTH;
          return content.slice(lineStart + 6, lineStart + 9) === lineCode;
        });
        if (structuralMatches.length === 1) return structuralMatches[0];

        const occurrenceIndex =
          Number.isInteger(occurrence) && (occurrence ?? 0) > 0 ? occurrence! - 1 : 0;
        if (occurrenceIndex < structuralMatches.length) return structuralMatches[occurrenceIndex];
      }
      return -1;
    }
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

  // Modelo sem sequencial numérico (ex.: segmentos SAP IDoc, identificados por nome —
  // `EDI_DC40`, `ZRSDM_NFE_400_EMIT` etc. — em vez de um código de 6/3 dígitos): não há
  // marcador de conteúdo para ancorar a busca, então a única evidência confiável é a ORDEM DE
  // APARIÇÃO do grupo. `fallbackIndex` já É essa ordem: o chamador agrupa os campos pela chave
  // `lineName + occurrence`, preservando a ordem em que o back-end devolveu os campos (que é a
  // ordem física do TXT) — logo, a posição do grupo na lista já resolve a n-ésima ocorrência do
  // segmento sem precisar casar string nenhuma.
  //
  // Antes, esse fallback só era aceito quando `content.length` fosse múltiplo EXATO de 600 E
  // batesse exatamente com `totalGroups`; qualquer folga (documento com padding residual, linha
  // de controle sem campos exibíveis etc.) bloqueava a edição inteira do modelo IDoc com "A
  // ocorrência física desta linha não pôde ser identificada", mesmo a ordem estando correta.
  // Mantemos a validação de limites (índice dentro do total de linhas físicas cabíveis no
  // conteúdo) como guarda mínima contra índice fora do documento.
  const physicalLineCount = Math.floor(content.length / POSITIONAL_LINE_LENGTH);
  if (
    totalGroups > 0 &&
    Number.isInteger(fallbackIndex) &&
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
