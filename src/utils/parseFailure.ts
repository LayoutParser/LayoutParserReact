import type { ParseErrorInfo, ParseFailureCause } from '../types/api';

/**
 * Reconciliação entre a taxonomia AUTORITATIVA do back-end (`failureCause`, spec "Taxonomia de
 * falha do parse") e a classificação de transporte que o front já fazia (`ParseErrorKind`:
 * houve resposta HTTP? qual status?).
 *
 * NÃO são duas taxonomias concorrentes: `failureCause` manda sempre que vem no corpo; `kind`
 * só entra como fallback enquanto o back-end não emite o campo (e no caso de rede, onde não
 * existe corpo nenhum para ler). Quando os dois discordarem — ex.: `parser_defect` chegando
 * num 422, o que contraria a spec §3 — quem prevalece é o `failureCause`, porque ele é o
 * julgamento de quem viu a exceção.
 */
export type ParseFailureView =
  | ParseFailureCause
  // Fallbacks (nenhum `failureCause` no corpo):
  | 'document_unclassified' // 422 sem causa declarada — sabemos que é dos arquivos, não qual
  | 'request_rejected' // 4xx que não 422 (ex.: BadRequest por arquivo faltando)
  | 'unreachable'; // nunca houve resposta HTTP (rede/timeout/CORS)

const FAILURE_CAUSES: readonly ParseFailureCause[] = [
  'parser_defect',
  'document_malformed',
  'layout_invalid',
];

/** Type guard do conjunto fechado da spec — usado ao ler o corpo do erro em services/api.ts. */
export const isParseFailureCause = (value: unknown): value is ParseFailureCause =>
  typeof value === 'string' && (FAILURE_CAUSES as readonly string[]).includes(value);

export interface ParseFailureAssessment {
  /** Chave única de apresentação. Ver ParseFailureView. */
  view: ParseFailureView;
  /**
   * A falha aponta para algum ARQUIVO ENVIADO PELO USUÁRIO (o documento ou o layout)?
   *
   * É a regra de produto do dono do projeto em forma de booleano: quando a falha é nossa
   * (`parser_defect`) ou da requisição, não se apresenta o documento nem se manda o usuário
   * caçar problema em arquivo que provavelmente está bom. Só quando ela é dos arquivos dele é
   * que vale apontar o erro com a maior precisão que o payload permitir.
   *
   * Fala em "artefato" e não em "documento" de propósito: `layout_invalid` culpa o XML do
   * LAYOUT, não o TXT. Qual dos dois abrir é o que distingue os rótulos de 422 — quem escreve
   * o texto de cada view é que resolve isso, não este booleano.
   */
  blamesUserArtifact: boolean;
}

/** Classifica uma falha de parse já capturada, priorizando o `failureCause` do back-end. */
export const assessParseFailure = (error: ParseErrorInfo): ParseFailureAssessment => {
  if (error.failureCause) {
    return {
      view: error.failureCause,
      blamesUserArtifact: error.failureCause !== 'parser_defect',
    };
  }

  if (error.kind === 'network_error') {
    return { view: 'unreachable', blamesUserArtifact: false };
  }

  if (error.kind === 'parse_error') {
    return { view: 'document_unclassified', blamesUserArtifact: true };
  }

  // `server_error` cobre 5xx e os 4xx inesperados.
  //  - 5xx sem causa declarada cai em `parser_defect` porque na spec §2.3 todo 5xx do parse É
  //    defeito nosso; não inventamos um estado "500 de origem desconhecida" que teria
  //    exatamente a mesma apresentação.
  //  - 4xx é problema da REQUISIÇÃO que este front montou (ex.: faltou arquivo), não do
  //    documento — então também não culpa o arquivo do usuário.
  const isServerFault = typeof error.httpStatus === 'number' && error.httpStatus >= 500;
  return {
    view: isServerFault ? 'parser_defect' : 'request_rejected',
    blamesUserArtifact: false,
  };
};
