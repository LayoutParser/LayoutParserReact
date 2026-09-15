import type { MappingAuthoringEngine, MappingDraftEvidence } from './mappingDraft';
import type { FiscalProfile, ResolvedXsdReference } from './workspace';

export type MappingReleaseStatus =
  | 'draft_compiled'
  | 'test_passed'
  | 'test_failed'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'deprecated'
  | 'archived';
export type MappingAsyncJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type MappingGovernanceEnvironment = 'development' | 'validation' | 'production';

export interface MappingReleaseArtifact {
  kind: string;
  content: string;
  hash: string;
  generatedAt: string;
}

export interface MappingCompileDiagnostic {
  ruleId: string;
  severity: string;
  message: string;
}

export interface MappingTestRunDivergence {
  kind: string;
  xpath: string;
  expected: string | null;
  actual: string | null;
  ruleId: string | null;
  sourceRefs: string[] | null;
  evidence: MappingDraftEvidence[] | null;
}

export interface MappingTestRunSummary {
  passed: number;
  failed: number;
  coveragePercent: number;
  requiredGatesPassed: boolean;
  xsdValid: boolean;
  xsdErrors: string[];
  divergences: MappingTestRunDivergence[];
  /**
   * Aditivo (issue #228): mesmas divergências de `divergences`, agrupadas por `ruleId` para
   * granularidade linha-a-linha. `null` quando a API ainda não populou o agrupamento (releases
   * antigas) — tratar como equivalente a "sem agrupamento disponível", não como erro.
   */
  divergencesByRuleId: Record<string, MappingTestRunDivergence[]> | null;
}

/** Cobertura de campos obrigatórios do schema fiscal para a release (issue #198). */
export interface MappingRequiredCoverage {
  percent: number;
  uncovered: string[];
}

export type MappingArtifactSource = 'generated' | 'manual_edit';

export interface MappingRelease {
  releaseId: string;
  workspaceId: string;
  draftId: string;
  engine: MappingAuthoringEngine;
  artifacts: MappingReleaseArtifact[];
  sourceRuleIds: string[];
  compileDiagnostics: MappingCompileDiagnostic[];
  rulesSnapshotHash: string;
  testRunSummary: MappingTestRunSummary | null;
  status: MappingReleaseStatus;
  correlationId: string;
  createdAt: string;
  eTag: string;
  /** O GET do Slice 5 ainda omite estes campos; as mutações do Slice 7 os preenchem. */
  environment: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  approvalJustification: string | null;
  publishedByUserId: string | null;
  publishedAt: string | null;
  previousPublishedReleaseId: string | null;
  /** Eco do fiscalProfile do draft no momento da release (issue #198). `null` sem perfil. */
  fiscalProfile: FiscalProfile | null;
  resolvedXsd: ResolvedXsdReference | null;
  /** `null` quando a release não tem `fiscalProfile` (sem base para calcular cobertura). */
  requiredCoverage: MappingRequiredCoverage | null;
  /** Origem do artefato (issue #226). `'generated'` cobre releases anteriores à feature. */
  artifactSource: MappingArtifactSource;
  /** Release de origem quando `artifactSource === 'manual_edit'`; `null` caso contrário. */
  derivedFromReleaseId: string | null;
  /** Justificativa obrigatória da edição manual; `null` quando `artifactSource === 'generated'`. */
  manualEditReason: string | null;
  /** Engines (`tcl`/`xslt`/`sysmiddle`) cujo artefato foi editado manualmente nesta release. */
  manuallyEditedArtifactKinds: string[];
}

/** Resposta parcial e autoritativa devolvida por approve/publish/rollback. */
export interface MappingGovernanceSnapshot {
  releaseId: string;
  workspaceId: string;
  draftId: string;
  engine: MappingAuthoringEngine;
  status: MappingReleaseStatus;
  environment: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  approvalJustification: string | null;
  publishedByUserId: string | null;
  publishedAt: string | null;
  previousPublishedReleaseId: string | null;
  correlationId: string;
  eTag: string;
}

export interface MappingCompileJob {
  jobId: string;
  status: MappingAsyncJobStatus;
  releaseId: string | null;
  error: string | null;
  durationMs: number | null;
}

export interface MappingTestRunJob extends MappingCompileJob {
  requiredGatesPassed: boolean | null;
}

export interface CreateMappingTestRunInput {
  workspaceId: string;
  draftId: string;
  releaseId: string;
  inputXml: string;
  expectedXml: string;
  xsdVersion?: string;
}

/**
 * Item resumido de release devolvido pela listagem paginada (issue #198). Espelha o
 * `ToReleaseResponse` do `MappingGovernanceController` — não inclui artefatos, diagnósticos
 * de compilação nem o resumo do test run (só o GET de detalhe traz isso).
 */
export interface MappingReleaseSummary {
  releaseId: string;
  workspaceId: string;
  draftId: string;
  engine: MappingAuthoringEngine;
  status: MappingReleaseStatus;
  environment: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  approvalJustification: string | null;
  publishedByUserId: string | null;
  publishedAt: string | null;
  previousPublishedReleaseId: string | null;
  correlationId: string;
  eTag: string;
}

export interface MappingReleaseListResponse {
  items: MappingReleaseSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/**
 * Body do PATCH .../mapping-drafts/{draftId}/artifacts/{engine} (issue #226). `baseArtifactHash`
 * vai no header `If-Match`, não no body — ver `mappingReleaseService.editArtifact`.
 */
export interface EditMappingArtifactInput {
  workspaceId: string;
  draftId: string;
  engine: MappingAuthoringEngine;
  baseArtifactHash: string;
  content: string;
  justification: string;
}

/**
 * Diff agregado por elemento de schema entre duas releases do mesmo draft (issue #228 diff A×B).
 * Shape NÃO confirmado contra OpenAPI/MCP — a única garantia recebida é "agregado por elemento
 * de schema, não lista plana"; modelado com um formato mínimo plausível. Revalidar com
 * `@lp-contract-qa` antes de expandir a UI sobre isso.
 */
export interface MappingReleaseDiffElementChange {
  element: string;
  changeKind: string;
  fromValue: string | null;
  toValue: string | null;
}

export interface MappingReleaseDiff {
  fromReleaseId: string;
  toReleaseId: string;
  changes: MappingReleaseDiffElementChange[];
}
