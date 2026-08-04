import type { DocumentHealth, DocumentValidationError, ParseResponse } from '../types/api';

/**
 * O terceiro estado do parse: HTTP 200 com o documento renderizável, porém com defeito
 * localizável (spec "Taxonomia de falha do parse" §2.1). Antes só existiam "200 limpo" e
 * "erro", e o defeito localizável ficava sem estado próprio.
 *
 * `documentHealth` é ADITIVO: enquanto o back-end não emitir, derivamos de `validationErrors`.
 * Se os dois discordarem (`clean` com erros na lista), vale a lista — esconder defeito que o
 * payload descreve seria pior que exibir um defeito a mais.
 */
export const resolveDocumentHealth = (result: ParseResponse | null | undefined): DocumentHealth => {
  if (!result) {
    return 'clean';
  }

  const hasErrors = (result.validationErrors?.length ?? 0) > 0;
  return result.documentHealth === 'has_defects' || hasErrors ? 'has_defects' : 'clean';
};

/** Trata `null`/`undefined`/string em branco como "não informado" de forma uniforme. */
const informed = (value: string | null | undefined): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : undefined;
};

/**
 * Rótulo da linha como o usuário a enxerga no documento posicional: a primeira linha é o
 * HEADER e as demais são numeradas com 3 dígitos a partir de 000.
 */
export const formatLineLabel = (lineIndex: number): string =>
  lineIndex === 0 ? 'HEADER' : String(lineIndex - 1).padStart(3, '0');

export interface ValidationErrorTarget {
  /** Onde está o defeito, na maior precisão que o payload sustenta. */
  label: string;
  /**
   * `true` só quando o BACK-END informou o campo. `false` significa que caímos na anotação
   * por linha/posição — e a UI não deve alegar identidade de campo nesse caso.
   */
  identifiedField: boolean;
  fieldName?: string;
  fieldGuid?: string;
  targetXPath?: string;
}

/**
 * Descreve o alvo de um erro de validação priorizando a IDENTIDADE DE CAMPO (spec §3) e
 * caindo para linha/posição quando ela não vem.
 *
 * `fieldName`/`fieldGuid`/`targetXPath` são opcionais e explicitamente anuláveis enquanto o
 * back-end não os emite (`targetXPath` depende da linhagem campo→XPath, que ainda não
 * existe). `null` aqui significa "não sei qual campo" — e a resposta certa a isso é apontar a
 * linha, não adivinhar um campo que o dado não sustenta.
 */
export const describeValidationErrorTarget = (
  error: DocumentValidationError
): ValidationErrorTarget => {
  const fieldName = informed(error.fieldName);
  const lineLabel = formatLineLabel(error.lineIndex);

  if (fieldName) {
    return {
      label: `Campo ${fieldName} · linha ${lineLabel}`,
      identifiedField: true,
      fieldName,
      fieldGuid: informed(error.fieldGuid),
      targetXPath: informed(error.targetXPath),
    };
  }

  return {
    label: `Linha ${lineLabel} · posições ${error.startPosition}–${error.endPosition}`,
    identifiedField: false,
    fieldGuid: informed(error.fieldGuid),
    targetXPath: informed(error.targetXPath),
  };
};
