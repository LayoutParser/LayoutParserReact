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
