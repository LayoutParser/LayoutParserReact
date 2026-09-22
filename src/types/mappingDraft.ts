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

/**
 * Item do catálogo de drafts do workspace (issue #198, parte 1) —
 * GET /api/workspaces/{workspaceId}/mapping-drafts. Confirmado por @lp-contract-qa contra
 * origin/develop em 2026-09-22 (LayoutParserApi#416/PR#420) — sem drift.
 * Não tem `layoutGuid`/`layoutName`/`updatedAt`/`status`: o draft não carrega status próprio
 * no domínio (status vive na release, não no draft).
 */
export interface MappingDraftSummary {
  draftId: string;
  workspaceId: string;
  packageId: string;
  revisionId: string;
  engine: MappingAuthoringEngine;
  createdAt: string;
  rulesCount: number;
  fiscalProfile: FiscalProfile | null;
}

export interface MappingDraftListResponse {
  items: MappingDraftSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
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
