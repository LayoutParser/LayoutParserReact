export type MappingPackageArtifactKind =
  'sample' | 'layout' | 'spec' | 'xsd' | 'expectedXml' | 'fiscalContext';

export type ArtifactInspectionStatus = 'pending' | 'clean' | 'rejected';

export type ArtifactQualityStatus = 'complete' | 'failed';

/**
 * Sinais de qualidade semântica de um artefato (Gap 3 — issue #201, LayoutParserApi#424).
 * `checksRun` é a lista de checks efetivamente executados: um array vazio em outro campo só
 * significa "sem achado" quando o nome do check correspondente consta em `checksRun` — caso
 * contrário é "não verificado ainda". Ver `.claude/agent-memory/lp-product-manager/
 * project_fiscal_201_quality_signals_checksrun_2026_09_21.md`.
 */
export interface FiscalArtifactQualitySignals {
  missingRequiredColumns: string[];
  conflicts: { field: string; reason: string }[];
  absentReferences: string[];
  skippedSheets: string[];
  emptySheets: string[];
  checksRun: string[];
}

export interface MappingPackageArtifactSummary {
  artifactId: string;
  kind: MappingPackageArtifactKind;
  sha256: string;
  sizeBytes: number;
  originalFileName: string;
  inspectionStatus: ArtifactInspectionStatus;
  uploadedAt: string;
  qualityStatus?: ArtifactQualityStatus | null;
  qualityError?: string | null;
  qualitySignals?: FiscalArtifactQualitySignals | null;
}

export interface MappingPackageRevisionSummary {
  revisionId: string;
  revisionNumber: number;
  createdAt: string;
  artifacts: MappingPackageArtifactSummary[];
}

export interface FiscalMappingPackageDetail {
  packageId: string;
  workspaceId: string;
  projectId: string;
  name: string;
  createdAt: string;
  revisions: MappingPackageRevisionSummary[];
}

export interface MappingPackageArtifactUpload {
  kind: MappingPackageArtifactKind;
  file: File;
}

export interface CreateMappingPackageInput {
  workspaceId: string;
  projectId: string;
  name?: string;
  idempotencyKey: string;
  artifacts: MappingPackageArtifactUpload[];
  onProgress?: (percentage: number) => void;
}

/** Projeto fiscal do workspace (Gap 1 — issue #201). Leitura pura, sem CRUD. */
export interface FiscalProjectSummary {
  projectId: string;
  workspaceId: string;
  name: string;
  createdAt: string;
}

/** Cria uma nova revisão de um pacote já existente (Gap 2 — issue #201). */
export interface CreateMappingPackageRevisionInput {
  workspaceId: string;
  packageId: string;
  artifacts: MappingPackageArtifactUpload[];
  onProgress?: (percentage: number) => void;
}

/** Inventário de uma aba do Excel reconhecida como tabela de decisão fiscal (Gap 3 — issue #201). */
export interface ExcelSheetInventory {
  sheetName: string;
  columns: string[];
  ruleCount: number;
}

export interface ExcelInventoryResult {
  decisionSheets: ExcelSheetInventory[];
  skippedSheets: string[];
}
