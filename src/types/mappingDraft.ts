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
