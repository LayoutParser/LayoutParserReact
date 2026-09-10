// Tipos para a curadoria de correções de campo (Story #244) — fila de divergências reportadas
// pelo analista fiscal (#232/#234) que um curador/revisor decide aceitar ou rejeitar antes de
// alimentar o dataset de treino de IA.
//
// Contrato confirmado por @lp-contract-qa em 2026-09-10 contra a fonte real
// (LayoutParserApi/Controllers/TransformationExecutionController.cs L487-655/L1743-1764 e
// LayoutParserApi/Models/Fiscal/FieldCorrection.cs — issue #346):
//   GET  /api/transformation/field-correction/pending
//     response: { success: boolean, count: number, reports: FieldCorrectionReport[] }
//   POST /api/transformation/field-correction/{reportId}/review
//     body: { decision: "accepted" | "rejected" }
//     response: { reportId: string, status: FieldCorrectionStatus } — NÃO o relatório completo.
//     Idempotente na semântica de negócio (só "pending" transiciona), mas o endpoint responde
//     409 num segundo review do mesmo reporte — não é um "no-op silencioso".

export type FieldCorrectionStatus = 'pending' | 'reviewed_accepted' | 'reviewed_rejected';

export type FieldCorrectionDecision = 'accepted' | 'rejected';

export interface FieldCorrectionReport {
  reportId: string;
  documentId: string;
  candidateId: string;
  /** Caminho do campo divergente (ex.: "/NFe/infNFe/det[1]/prod/vProd"). */
  fieldPath: string;
  observedValue?: string;
  expectedValue?: string;
  justification?: string;
  reportedByUserId: string;
  status: FieldCorrectionStatus;
  createdAtUtc: string;
  reviewedByUserId?: string;
  reviewedAtUtc?: string;
}

export interface FieldCorrectionPendingResponse {
  success: boolean;
  count: number;
  reports: FieldCorrectionReport[];
}

export interface FieldCorrectionReviewRequest {
  decision: FieldCorrectionDecision;
}

/** Resposta mínima do POST de revisão — a API não devolve o relatório completo. */
export interface FieldCorrectionReviewResponse {
  reportId: string;
  status: FieldCorrectionStatus;
}

/** Causa de falha ao carregar a fila ou registrar a decisão, já classificada para a UI. */
export type FieldCorrectionCurationErrorKind =
  'not_found' | 'conflict' | 'network_error' | 'server_error';

export interface FieldCorrectionCurationErrorInfo {
  kind: FieldCorrectionCurationErrorKind;
  message: string;
  httpStatus?: number;
}
