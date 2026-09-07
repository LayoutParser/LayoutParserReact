export type MappingPackageArtifactKind =
  'sample' | 'layout' | 'spec' | 'xsd' | 'expectedXml' | 'fiscalContext';

export type ArtifactInspectionStatus = 'pending' | 'clean' | 'rejected';

export interface MappingPackageArtifactSummary {
  artifactId: string;
  kind: MappingPackageArtifactKind;
  sha256: string;
  sizeBytes: number;
  originalFileName: string;
  inspectionStatus: ArtifactInspectionStatus;
  uploadedAt: string;
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
