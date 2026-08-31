/** Tipos fiscais suportados pelo posicionamento inicial do produto. */
export type FiscalDocumentType = 'nfe' | 'cte' | 'mdfe' | 'nfse' | 'nfcom';

export type WorkspaceKind = 'personal' | 'organization';
export type WorkspaceRole =
  'owner' | 'fiscal_admin' | 'mapper' | 'reviewer' | 'operator' | 'viewer';

export type DocumentFormat = 'fixed_width' | 'mqseries' | 'idoc' | 'xml' | 'json';
export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
export type MappingEngine = 'tcl' | 'xsl' | 'xslt' | 'sysmiddle';
export type MappingSupportLevel = 'authoritative' | 'best_effort' | 'opaque' | 'unsupported';
export type MappingRuleKind =
  | 'copy'
  | 'constant'
  | 'transform'
  | 'condition'
  | 'loop'
  | 'lookup'
  | 'aggregate'
  | 'script'
  | 'unknown';

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

export interface MappingRuleReference {
  ref: string;
  label: string;
}

export interface MappingOperation {
  name: string;
  arguments: string[];
}

export interface MappingRuleExplanation {
  ruleId: string;
  order: number;
  kind: MappingRuleKind;
  label: string;
  humanDescription: string;
  sources: MappingRuleReference[];
  targets: MappingRuleReference[];
  condition: string | null;
  operations: MappingOperation[];
  supportLevel: MappingSupportLevel;
  limitations: string[];
}

export interface SchemaReference {
  schemaId: string;
  format: DocumentFormat;
  fiscalDocumentType: FiscalDocumentType;
  version: string;
  jurisdiction?: string | null;
}

export interface MappingExplanation {
  mappingId: string;
  version: number;
  engine: MappingEngine;
  supportLevel: MappingSupportLevel;
  sourceSchema: SchemaReference;
  targetSchema: SchemaReference;
  rules: MappingRuleExplanation[];
  opaqueRuleCount: number;
  limitations: string[];
}
