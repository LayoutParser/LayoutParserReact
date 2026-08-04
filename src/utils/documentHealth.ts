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

/**
 * O erro DESSINCRONIZA a leitura posicional do documento a partir dali?
 *
 * Critério: `expectedLength !== actualLength`. Vai parecer arbitrário para quem chegar depois,
 * então: o documento é posicional e lido por offset fixo (linha N começa em N × 600). Só um
 * erro de TAMANHO de linha desloca todo o resto — daí em diante os campos são recortados na
 * posição errada e exibi-los seria mostrar lixo como se fosse dado.
 *
 * Os demais erros do validador (sequência inválida, HEADER fora de posição) chegam com
 * `expectedLength == actualLength`: o comprimento estava certo, o CONTEÚDO é que não. Esses
 * não movem offset nenhum, então as linhas seguintes continuam confiáveis e devem seguir
 * sendo exibidas — cortar por causa deles esconderia dezenas de registros alinhados por conta
 * de um defeito que não afeta alinhamento (caso real observado: 47 erros de sequência num
 * documento, todos com expected == actual).
 *
 * Em dúvida sobre a classe de um erro novo, o conservador é tratar como dessincronizante.
 */
export const isDesyncingValidationError = (error: DocumentValidationError): boolean =>
  error.expectedLength !== error.actualLength;

/**
 * Índice da primeira linha a partir da qual a leitura posicional deixa de ser confiável.
 * `-1` quando nenhum erro dessincroniza — aí não há motivo para cortar exibição alguma.
 */
export const findFirstDesyncLineIndex = (errors: DocumentValidationError[] | undefined): number => {
  const desyncing = (errors ?? []).filter(isDesyncingValidationError);
  return desyncing.length > 0 ? Math.min(...desyncing.map(error => error.lineIndex)) : -1;
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

/** Granularidade REAL da identificação — nunca alegue mais precisão do que este valor. */
export type ValidationErrorIdentity = 'field' | 'record' | 'line';

export interface ValidationErrorTarget {
  /** Onde está o defeito, na maior precisão que o payload sustenta. */
  label: string;
  identity: ValidationErrorIdentity;
  fieldName?: string;
  fieldGuid?: string;
  recordName?: string;
  recordGuid?: string;
  targetXPath?: string;
}

/**
 * Descreve o alvo de um erro de validação na hierarquia campo → registro → linha/posição.
 *
 * Por que os três níveis, e por que o do meio é o que roda hoje (spec §5.1): o validador
 * recebe só texto e um comprimento esperado — nunca vê o layout —, então `fieldName`/
 * `fieldGuid` vêm SEMPRE nulos e continuarão assim até existir validação escopada a campo.
 * O que o back-end consegue resolver é o REGISTRO (`recordName`/`recordGuid`), casando o
 * `sequence` do erro com o `LineElement` do layout.
 *
 * Consequência para o texto da UI: com dado de registro só é honesto dizer "o registro X tem
 * problema na linha N, colunas A-B". Prometer precisão de campo aqui seria mentir com dado de
 * segmento — que é exatamente o que a spec recusou ao manter `fieldGuid` nulo em vez de
 * preenchê-lo com o GUID do registro.
 */
export const describeValidationErrorTarget = (
  error: DocumentValidationError
): ValidationErrorTarget => {
  const fieldName = informed(error.fieldName);
  const recordName = informed(error.recordName);
  const lineLabel = formatLineLabel(error.lineIndex);
  const position = `linha ${lineLabel} · posições ${error.startPosition}–${error.endPosition}`;

  const common = {
    fieldName,
    fieldGuid: informed(error.fieldGuid),
    recordName,
    recordGuid: informed(error.recordGuid),
    targetXPath: informed(error.targetXPath),
  };

  if (fieldName) {
    return { ...common, label: `Campo ${fieldName} · ${position}`, identity: 'field' };
  }

  if (recordName) {
    // Registro sozinho não localiza o defeito (o segmento se repete ao longo do arquivo), por
    // isso linha e colunas continuam no rótulo — o registro entra como CONTEXTO.
    return { ...common, label: `Registro ${recordName} · ${position}`, identity: 'record' };
  }

  return {
    ...common,
    label: `Linha ${lineLabel} · posições ${error.startPosition}–${error.endPosition}`,
    identity: 'line',
  };
};
