// Tipos para a curadoria de correções de campo (Story #244) — fila de divergências reportadas
// pelo analista fiscal (#232/#234) que um curador/revisor decide aceitar ou rejeitar antes de
// alimentar o dataset de treino de IA.
//
// Contrato confirmado em produção em 2026-09-10 (LayoutParserApi#345 e sucessores):
//   GET  /api/transformation/field-correction/pending
//     response: { reports: FieldCorrectionReport[] }
//   POST /api/transformation/field-correction/{reportId}/review
//     body: { decision: "accepted" | "rejected" }
//     response: FieldCorrectionReport (com status atualizado)
//     idempotente — reenviar a mesma decisão não duplica efeito; somente decision=accepted
//     resultando em status "reviewed_accepted" alimenta o dataset de treino.
//
// Os campos abaixo do relatório em si (nó XML, valores original/corrigido) refletem o que a
// Story #234 relata ao curador; nomes exatos devem ser reconfirmados por @lp-contract-qa contra
// o payload real assim que a tela for validada de ponta a ponta.

export type FieldCorrectionStatus = 'pending' | 'reviewed_accepted' | 'reviewed_rejected';

export type FieldCorrectionDecision = 'accepted' | 'rejected';

export interface FieldCorrectionReport {
  reportId: string;
  documentId: string;
  /** Caminho do nó divergente na árvore XML (ex.: "/NFe/infNFe/det[1]/prod/vProd"). */
  nodePath: string;
  originalValue: string;
  correctedValue: string;
  comment?: string;
  reportedBy?: string;
  reportedAt: string;
  status: FieldCorrectionStatus;
}

export interface FieldCorrectionPendingResponse {
  reports: FieldCorrectionReport[];
}

export interface FieldCorrectionReviewRequest {
  decision: FieldCorrectionDecision;
}

/** Causa de falha ao carregar a fila ou registrar a decisão, já classificada para a UI. */
export type FieldCorrectionCurationErrorKind = 'not_found' | 'network_error' | 'server_error';

export interface FieldCorrectionCurationErrorInfo {
  kind: FieldCorrectionCurationErrorKind;
  message: string;
  httpStatus?: number;
}
