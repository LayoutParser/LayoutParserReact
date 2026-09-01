import type { MappingAuthoringEngine, MappingDraftEvidence } from './mappingDraft';

export type MappingReleaseStatus = 'draft_compiled' | 'test_passed' | 'test_failed';
export type MappingAsyncJobStatus = 'queued' | 'running' | 'completed' | 'failed';

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
}

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
