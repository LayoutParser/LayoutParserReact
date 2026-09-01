/** Tipos fiscais suportados pelo posicionamento inicial do produto. */
export type FiscalDocumentType = 'nfe' | 'cte' | 'mdfe' | 'nfse' | 'nfcom';

export type WorkspaceKind = 'personal' | 'organization';
export type WorkspaceRole =
  'owner' | 'fiscal_admin' | 'mapper' | 'reviewer' | 'operator' | 'viewer';

export type DocumentFormat = 'fixed_width' | 'mqseries' | 'idoc' | 'xml' | 'json';
export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
export type MappingEngine = 'tcl' | 'xslt' | 'sysmiddle';
export type MappingSupportLevel = 'authoritative' | 'best_effort' | 'opaque' | 'unsupported';

export interface FiscalWorkspaceSummary {
  workspaceId: string;
  name: string;
  kind: WorkspaceKind;
  role: WorkspaceRole;
  createdAt: string;
}

export interface CurrentWorkspacesResponse {
  activeWorkspaceId: string;
  workspaces: FiscalWorkspaceSummary[];
}

export type WorkspaceLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FiscalProfile {
  documentType: FiscalDocumentType;
  schemaVersion: string;
  operation: string;
  jurisdiction?: string | null;
}

export interface FiscalProjectSummary {
  projectId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  defaultFiscalDocumentType?: FiscalDocumentType | null;
  updatedAt: string;
}

export interface DocumentAnalysisSummary {
  analysisId: string;
  projectId: string;
  fileName: string;
  format: DocumentFormat;
  fiscalProfile: FiscalProfile;
  status: AnalysisStatus;
  layoutGuid?: string | null;
  correlationId: string;
  createdAt: string;
  completedAt?: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AnalysisFilters {
  cursor?: string;
  documentType?: FiscalDocumentType;
  status?: AnalysisStatus;
  from?: string;
  to?: string;
  layoutGuid?: string;
}

export interface MappingEngineCapabilities {
  execute: boolean;
  explain: boolean;
  author: boolean;
  compile: boolean;
  publish: boolean;
}

export interface MappingSchemaReference {
  layoutGuid: string | null;
  description: string | null;
}

export interface MappingEvidenceReference {
  kind: string;
  reference: string;
}

export interface MappingRuleExplanation {
  ruleId: string;
  sourceRefs: string[];
  targetRefs: string[];
  condition: string | null;
  operations: string[];
  cardinality: string;
  evidence: MappingEvidenceReference[];
  humanDescription: string;
  technicalDetail: string | null;
  supportLevel: MappingSupportLevel;
}

export interface MappingExplanation {
  mappingId: string;
  version: string;
  engine: MappingEngine;
  capabilities: MappingEngineCapabilities;
  sourceSchema: MappingSchemaReference | null;
  targetSchema: MappingSchemaReference | null;
  rules: MappingRuleExplanation[];
  description: string | null;
  opaqueRuleCount: number;
  limitations: string[];
}
