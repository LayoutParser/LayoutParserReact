import type { FiscalProfile, ResolvedXsdReference } from './workspace';

export type MappingAuthoringEngine = 'tcl' | 'xslt';

export type MappingDraftRuleStatus =
  'proposed' | 'accepted' | 'edited' | 'rejected' | 'needs_input' | 'validated' | 'superseded';

export type MappingSuggestionJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';

export interface MappingDraftEvidence {
  kind: string;
  reference: string;
}

export interface MappingDraftRule {
  ruleId: string;
  draftId: string;
  sourceRefs: string[];
  targetRefs: string[];
  operation: string;
  conditions: string;
  transformations: string;
  cardinality: string;
  evidence: MappingDraftEvidence[];
  confidence: string;
  status: MappingDraftRuleStatus;
  questions: string[];
  createdAt: string;
  eTag: string;
}

export interface MappingDraft {
  draftId: string;
  workspaceId: string;
  packageId: string;
  revisionId: string;
  engine: MappingAuthoringEngine;
  createdAt: string;
  rules: MappingDraftRule[];
  /**
   * Perfil fiscal gravado via PUT .../fiscal-profile (issue #198). `null` quando o draft ainda
   * não teve perfil definido. Reaproveita `FiscalProfile` de `workspace.ts` — a API reportou o
   * mesmo shape de body para draft/release; se divergir, desdobrar em tipo próprio.
   */
  fiscalProfile: FiscalProfile | null;
  /** Eco derivado de `XsdValidation:DocumentTypes`; `null` sem `fiscalProfile`. */
  resolvedXsd: ResolvedXsdReference | null;
}

/** Body do PUT .../mapping-drafts/{draftId}/fiscal-profile (issue #198). */
export interface SetFiscalProfileInput {
  workspaceId: string;
  draftId: string;
  profile: FiscalProfile;
}

export interface MappingSuggestionJob {
  jobId: string;
  status: MappingSuggestionJobStatus;
  rulesCreated?: number;
  error?: string | null;
}

export interface CreateMappingDraftInput {
  workspaceId: string;
  packageId: string;
  revisionId: string;
  engine: MappingAuthoringEngine;
}

export interface UpdateMappingDraftRuleInput {
  workspaceId: string;
  draftId: string;
  ruleId: string;
  eTag: string;
  status?: 'accepted' | 'edited' | 'rejected';
  justification?: string;
  sourceRefs?: string[];
  targetRefs?: string[];
  operation?: string;
  answer?: string;
}

/**
 * Resposta persistida para uma pergunta aberta (`MappingDraftRule.questions`) via
 * `PUT .../rules/{ruleId}/questions/{questionIndex}/answer` (LayoutParserApi#422). O histórico é
 * append-only: reenviar o mesmo texto não cria versão nova (idempotente), texto diferente cria.
 */
export interface MappingDraftRuleQuestionAnswer {
  questionIndex: number;
  questionSnapshot: string;
  answer: string;
  answeredBy: string;
  answeredAt: string;
  version: number;
}

export const MAPPING_DRAFT_RULE_ANSWER_MAX_LENGTH = 4000;

export interface AnswerMappingDraftRuleQuestionInput {
  workspaceId: string;
  draftId: string;
  ruleId: string;
  questionIndex: number;
  answer: string;
}
