import axios from 'axios';
import type {
  ArtifactInspectionStatus,
  CreateMappingPackageInput,
  FiscalMappingPackageDetail,
  MappingPackageArtifactKind,
  MappingPackageArtifactSummary,
  MappingPackageRevisionSummary,
} from '../../types/mappingPackage';
import apiClient from '../api';

const MAX_ARTIFACTS = 10;
const MAX_ARTIFACT_SIZE_BYTES = 50 * 1024 * 1024;
const artifactKinds = new Set<MappingPackageArtifactKind>([
  'sample',
  'layout',
  'spec',
  'xsd',
  'expectedXml',
  'fiscalContext',
]);
const inspectionStatuses = new Set<ArtifactInspectionStatus>(['pending', 'clean', 'rejected']);
const expectedExtension: Record<MappingPackageArtifactKind, string> = {
  sample: '.txt',
  layout: '.xml',
  spec: '.xlsx',
  xsd: '.xsd',
  expectedXml: '.xml',
  fiscalContext: '.json',
};

type MappingPackageRequestErrorKind =
  | 'invalid_input'
  | 'invalid_response'
  | 'not_found'
  | 'rejected'
  | 'unavailable'
  | 'request_failed';

export class MappingPackageRequestError extends Error {
  readonly kind: MappingPackageRequestErrorKind;

  constructor(kind: MappingPackageRequestErrorKind, message: string) {
    super(message);
    this.name = 'MappingPackageRequestError';
    this.kind = kind;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isArtifactKind(value: unknown): value is MappingPackageArtifactKind {
  return isNonEmptyString(value) && artifactKinds.has(value as MappingPackageArtifactKind);
}

function isInspectionStatus(value: unknown): value is ArtifactInspectionStatus {
  return isNonEmptyString(value) && inspectionStatuses.has(value as ArtifactInspectionStatus);
}

function parseArtifact(value: unknown): MappingPackageArtifactSummary {
  if (!isRecord(value)) {
    throw invalidResponse();
  }

  if (
    !isNonEmptyString(value.artifactId) ||
    !isArtifactKind(value.kind) ||
    !isNonEmptyString(value.sha256) ||
    typeof value.sizeBytes !== 'number' ||
    !Number.isSafeInteger(value.sizeBytes) ||
    value.sizeBytes < 1 ||
    !isNonEmptyString(value.originalFileName) ||
    !isInspectionStatus(value.inspectionStatus) ||
    !isValidDate(value.uploadedAt)
  ) {
    throw invalidResponse();
  }

  return value as unknown as MappingPackageArtifactSummary;
}

function parseRevision(value: unknown): MappingPackageRevisionSummary {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.revisionId) ||
    typeof value.revisionNumber !== 'number' ||
    !Number.isSafeInteger(value.revisionNumber) ||
    value.revisionNumber < 1 ||
    !isValidDate(value.createdAt) ||
    !Array.isArray(value.artifacts)
  ) {
    throw invalidResponse();
  }

  return {
    revisionId: value.revisionId,
    revisionNumber: value.revisionNumber,
    createdAt: value.createdAt,
    artifacts: value.artifacts.map(parseArtifact),
  };
}

function parsePackage(value: unknown): FiscalMappingPackageDetail {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.packageId) ||
    !isNonEmptyString(value.workspaceId) ||
    !isNonEmptyString(value.projectId) ||
    !isNonEmptyString(value.name) ||
    !isValidDate(value.createdAt) ||
    !Array.isArray(value.revisions) ||
    value.revisions.length === 0
  ) {
    throw invalidResponse();
  }

  const revisions = value.revisions.map(parseRevision);
  const revisionIds = new Set(revisions.map(revision => revision.revisionId));
  if (revisionIds.size !== revisions.length) {
    throw invalidResponse();
  }

  return {
    packageId: value.packageId,
    workspaceId: value.workspaceId,
    projectId: value.projectId,
    name: value.name,
    createdAt: value.createdAt,
    revisions,
  };
}

function invalidResponse(): MappingPackageRequestError {
  return new MappingPackageRequestError(
    'invalid_response',
    'A API devolveu um pacote fiscal inválido.'
  );
}

function resourceSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new MappingPackageRequestError('invalid_input', `${label} é obrigatório.`);
  }
  return encodeURIComponent(normalized);
}

function validateUpload(input: CreateMappingPackageInput): void {
  if (!isNonEmptyString(input.idempotencyKey)) {
    throw new MappingPackageRequestError(
      'invalid_input',
      'A chave idempotente da tentativa é obrigatória.'
    );
  }

  if (input.artifacts.length === 0 || input.artifacts.length > MAX_ARTIFACTS) {
    throw new MappingPackageRequestError(
      'invalid_input',
      `Envie entre 1 e ${MAX_ARTIFACTS} artefatos por pacote.`
    );
  }

  for (const artifact of input.artifacts) {
    const extension = artifact.file.name.slice(artifact.file.name.lastIndexOf('.')).toLowerCase();
    if (extension !== expectedExtension[artifact.kind]) {
      throw new MappingPackageRequestError(
        'invalid_input',
        `O arquivo de ${artifact.kind} deve usar a extensão ${expectedExtension[artifact.kind]}.`
      );
    }
    if (artifact.file.size === 0 || artifact.file.size > MAX_ARTIFACT_SIZE_BYTES) {
      throw new MappingPackageRequestError(
        'invalid_input',
        `O arquivo de ${artifact.kind} deve ter entre 1 byte e 50 MiB.`
      );
    }
  }
}

function responseMessage(data: unknown): string | null {
  return isRecord(data) && isNonEmptyString(data.error) ? data.error : null;
}

function mapRequestError(error: unknown): never {
  if (error instanceof MappingPackageRequestError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) {
      throw new MappingPackageRequestError(
        'not_found',
        'O pacote ou workspace não foi encontrado para esta identidade.'
      );
    }
    if (status === 422) {
      throw new MappingPackageRequestError(
        'rejected',
        responseMessage(error.response?.data) ?? 'A API recusou um ou mais artefatos do pacote.'
      );
    }
    if (!error.response || status === 503 || (status !== undefined && status >= 500)) {
      throw new MappingPackageRequestError(
        'unavailable',
        'O serviço de pacotes fiscais está temporariamente indisponível.'
      );
    }
  }

  throw new MappingPackageRequestError(
    'request_failed',
    'Não foi possível concluir a operação com o pacote fiscal.'
  );
}

export const mappingPackageService = {
  createIdempotencyKey(): string {
    return globalThis.crypto.randomUUID();
  },

  async createPackage(input: CreateMappingPackageInput): Promise<FiscalMappingPackageDetail> {
    const workspace = resourceSegment(input.workspaceId, 'Workspace');
    const project = resourceSegment(input.projectId, 'Projeto');
    validateUpload(input);

    const formData = new FormData();
    if (input.name?.trim()) {
      formData.append('name', input.name.trim());
    }
    input.artifacts.forEach(({ kind, file }) => formData.append(kind, file));

    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/projects/${project}/mapping-packages`,
        formData,
        {
          headers: { 'Idempotency-Key': input.idempotencyKey.trim() },
          onUploadProgress: event => {
            if (!input.onProgress || !event.total || event.total <= 0) {
              return;
            }
            input.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          },
        }
      );
      return parsePackage(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getPackage(workspaceId: string, packageId: string): Promise<FiscalMappingPackageDetail> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const packageResource = resourceSegment(packageId, 'Pacote');

    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-packages/${packageResource}`
      );
      return parsePackage(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },
};
