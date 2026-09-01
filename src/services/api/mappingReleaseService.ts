import axios from 'axios';
import type { MappingAuthoringEngine, MappingDraftEvidence } from '../../types/mappingDraft';
import type {
  CreateMappingTestRunInput,
  MappingAsyncJobStatus,
  MappingCompileDiagnostic,
  MappingCompileJob,
  MappingGovernanceEnvironment,
  MappingGovernanceSnapshot,
  MappingRelease,
  MappingReleaseArtifact,
  MappingReleaseStatus,
  MappingTestRunDivergence,
  MappingTestRunJob,
  MappingTestRunSummary,
} from '../../types/mappingRelease';
import apiClient from '../api';

const engines = new Set<MappingAuthoringEngine>(['tcl', 'xslt']);
const releaseStatuses = new Set<MappingReleaseStatus>([
  'draft_compiled',
  'test_passed',
  'test_failed',
  'in_review',
  'approved',
  'published',
  'deprecated',
  'archived',
]);
const governanceEnvironments = new Set<MappingGovernanceEnvironment>([
  'development',
  'validation',
  'production',
]);
const jobStatuses = new Set<MappingAsyncJobStatus>(['queued', 'running', 'completed', 'failed']);

export type MappingReleaseRequestErrorKind =
  | 'invalid_input'
  | 'invalid_response'
  | 'unauthorized'
  | 'not_found'
  | 'rejected'
  | 'unavailable'
  | 'request_failed';

export class MappingReleaseRequestError extends Error {
  readonly kind: MappingReleaseRequestErrorKind;

  constructor(kind: MappingReleaseRequestErrorKind, message: string) {
    super(message);
    this.name = 'MappingReleaseRequestError';
    this.kind = kind;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isValidDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isNullableValidDate(value: unknown): value is string | null {
  return value === null || isValidDate(value);
}

function parseOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (!isNonEmptyString(value)) throw invalidResponse();
  return value;
}

function parseOptionalDate(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (!isValidDate(value)) throw invalidResponse();
  return value;
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function resourceSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new MappingReleaseRequestError('invalid_input', `${label} é obrigatório.`);
  }
  return encodeURIComponent(normalized);
}

function invalidResponse(): MappingReleaseRequestError {
  return new MappingReleaseRequestError(
    'invalid_response',
    'A API devolveu uma release fiscal inválida.'
  );
}

function parseEvidence(value: unknown): MappingDraftEvidence {
  if (!isRecord(value) || !isNonEmptyString(value.kind) || !isNonEmptyString(value.reference)) {
    throw invalidResponse();
  }
  return value as unknown as MappingDraftEvidence;
}

function parseArtifact(value: unknown): MappingReleaseArtifact {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.kind) ||
    typeof value.content !== 'string' ||
    !isNonEmptyString(value.hash) ||
    !isValidDate(value.generatedAt)
  ) {
    throw invalidResponse();
  }
  return value as unknown as MappingReleaseArtifact;
}

function parseDiagnostic(value: unknown): MappingCompileDiagnostic {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.ruleId) ||
    !isNonEmptyString(value.severity) ||
    !isNonEmptyString(value.message)
  ) {
    throw invalidResponse();
  }
  return value as unknown as MappingCompileDiagnostic;
}

function parseDivergence(value: unknown): MappingTestRunDivergence {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.kind) ||
    !isNonEmptyString(value.xpath) ||
    !isNullableString(value.expected) ||
    !isNullableString(value.actual) ||
    !isNullableString(value.ruleId) ||
    !(value.sourceRefs === null || isStringArray(value.sourceRefs)) ||
    !(value.evidence === null || Array.isArray(value.evidence))
  ) {
    throw invalidResponse();
  }

  return {
    kind: value.kind,
    xpath: value.xpath,
    expected: value.expected,
    actual: value.actual,
    ruleId: value.ruleId,
    sourceRefs: value.sourceRefs,
    evidence: value.evidence === null ? null : value.evidence.map(parseEvidence),
  };
}

function parseTestSummary(value: unknown): MappingTestRunSummary {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.passed) ||
    !isNonNegativeInteger(value.failed) ||
    typeof value.coveragePercent !== 'number' ||
    !Number.isFinite(value.coveragePercent) ||
    value.coveragePercent < 0 ||
    value.coveragePercent > 100 ||
    typeof value.requiredGatesPassed !== 'boolean' ||
    typeof value.xsdValid !== 'boolean' ||
    !isStringArray(value.xsdErrors) ||
    !Array.isArray(value.divergences)
  ) {
    throw invalidResponse();
  }

  const summary: MappingTestRunSummary = {
    passed: value.passed,
    failed: value.failed,
    coveragePercent: value.coveragePercent,
    requiredGatesPassed: value.requiredGatesPassed,
    xsdValid: value.xsdValid,
    xsdErrors: value.xsdErrors,
    divergences: value.divergences.map(parseDivergence),
  };

  if (
    summary.requiredGatesPassed &&
    (!summary.xsdValid || summary.failed !== 0 || summary.divergences.length !== 0)
  ) {
    throw invalidResponse();
  }

  return summary;
}

function assertReleaseStateConsistency(
  status: MappingReleaseStatus,
  summary: MappingTestRunSummary | null
): void {
  if (status === 'draft_compiled' && summary !== null) throw invalidResponse();
  if (status === 'test_failed' && summary?.requiredGatesPassed !== false) throw invalidResponse();
  if (
    ['test_passed', 'in_review', 'approved', 'published', 'deprecated', 'archived'].includes(
      status
    ) &&
    summary?.requiredGatesPassed !== true
  ) {
    throw invalidResponse();
  }
}

function parseRelease(value: unknown): MappingRelease {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.releaseId) ||
    !isNonEmptyString(value.workspaceId) ||
    !isNonEmptyString(value.draftId) ||
    !isNonEmptyString(value.engine) ||
    !engines.has(value.engine as MappingAuthoringEngine) ||
    !Array.isArray(value.artifacts) ||
    !isStringArray(value.sourceRuleIds) ||
    !Array.isArray(value.compileDiagnostics) ||
    !isNonEmptyString(value.rulesSnapshotHash) ||
    !(value.testRunSummary === null || isRecord(value.testRunSummary)) ||
    !isNonEmptyString(value.status) ||
    !releaseStatuses.has(value.status as MappingReleaseStatus) ||
    !isNonEmptyString(value.correlationId) ||
    !isValidDate(value.createdAt) ||
    !isNonEmptyString(value.eTag)
  ) {
    throw invalidResponse();
  }

  const status = value.status as MappingReleaseStatus;
  const testRunSummary =
    value.testRunSummary === null ? null : parseTestSummary(value.testRunSummary);
  assertReleaseStateConsistency(status, testRunSummary);

  return {
    releaseId: value.releaseId,
    workspaceId: value.workspaceId,
    draftId: value.draftId,
    engine: value.engine as MappingAuthoringEngine,
    artifacts: value.artifacts.map(parseArtifact),
    sourceRuleIds: value.sourceRuleIds,
    compileDiagnostics: value.compileDiagnostics.map(parseDiagnostic),
    rulesSnapshotHash: value.rulesSnapshotHash,
    testRunSummary,
    status,
    correlationId: value.correlationId,
    createdAt: value.createdAt,
    eTag: value.eTag,
    environment: parseOptionalString(value.environment),
    approvedByUserId: parseOptionalString(value.approvedByUserId),
    approvedAt: parseOptionalDate(value.approvedAt),
    approvalJustification: parseOptionalString(value.approvalJustification),
    publishedByUserId: parseOptionalString(value.publishedByUserId),
    publishedAt: parseOptionalDate(value.publishedAt),
    previousPublishedReleaseId: parseOptionalString(value.previousPublishedReleaseId),
  };
}

function parseGovernanceSnapshot(
  value: unknown,
  expectedStatus: MappingReleaseStatus
): MappingGovernanceSnapshot {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.releaseId) ||
    !isNonEmptyString(value.workspaceId) ||
    !isNonEmptyString(value.draftId) ||
    !isNonEmptyString(value.engine) ||
    !engines.has(value.engine as MappingAuthoringEngine) ||
    !isNonEmptyString(value.status) ||
    !releaseStatuses.has(value.status as MappingReleaseStatus) ||
    !isNonEmptyString(value.environment) ||
    !isNullableString(value.approvedByUserId) ||
    !isNullableValidDate(value.approvedAt) ||
    !isNullableString(value.approvalJustification) ||
    !isNullableString(value.publishedByUserId) ||
    !isNullableValidDate(value.publishedAt) ||
    !isNullableString(value.previousPublishedReleaseId) ||
    !isNonEmptyString(value.correlationId) ||
    !isNonEmptyString(value.eTag)
  ) {
    throw invalidResponse();
  }

  const snapshot = value as unknown as MappingGovernanceSnapshot;
  if (snapshot.status !== expectedStatus) throw invalidResponse();
  if (
    ['approved', 'published', 'deprecated'].includes(snapshot.status) &&
    (!snapshot.approvedByUserId || !snapshot.approvedAt || !snapshot.approvalJustification)
  ) {
    throw invalidResponse();
  }
  if (
    ['published', 'deprecated'].includes(snapshot.status) &&
    (!snapshot.publishedByUserId || !snapshot.publishedAt)
  ) {
    throw invalidResponse();
  }
  return snapshot;
}

function assertGovernanceResource(
  snapshot: MappingGovernanceSnapshot,
  workspaceId: string,
  releaseId: string
): MappingGovernanceSnapshot {
  if (snapshot.workspaceId !== workspaceId.trim() || snapshot.releaseId !== releaseId.trim()) {
    throw invalidResponse();
  }
  return snapshot;
}

function parseJob(value: unknown): MappingCompileJob {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.jobId) ||
    !isNonEmptyString(value.status) ||
    !jobStatuses.has(value.status as MappingAsyncJobStatus) ||
    !isNullableString(value.releaseId) ||
    !isNullableString(value.error) ||
    !isNullableFiniteNumber(value.durationMs)
  ) {
    throw invalidResponse();
  }
  return {
    jobId: value.jobId,
    status: value.status as MappingAsyncJobStatus,
    releaseId: value.releaseId,
    error: value.error,
    durationMs: value.durationMs,
  };
}

function parseTestJob(value: unknown): MappingTestRunJob {
  const job = parseJob(value);
  if (
    !isRecord(value) ||
    !(value.requiredGatesPassed === null || typeof value.requiredGatesPassed === 'boolean')
  ) {
    throw invalidResponse();
  }
  return { ...job, requiredGatesPassed: value.requiredGatesPassed };
}

function responseMessage(data: unknown): string | null {
  return isRecord(data) && isNonEmptyString(data.error) ? data.error : null;
}

function mapRequestError(error: unknown): never {
  if (error instanceof MappingReleaseRequestError) throw error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = responseMessage(error.response?.data);
    if (status === 401 || status === 403) {
      throw new MappingReleaseRequestError(
        'unauthorized',
        status === 403
          ? 'Seu papel no workspace não permite esta operação de governança.'
          : 'Sua sessão não permite concluir esta operação fiscal.'
      );
    }
    if (status === 404) {
      throw new MappingReleaseRequestError(
        'not_found',
        'O draft, job, workspace ou release não foi encontrado para esta identidade.'
      );
    }
    if (status === 400 || status === 422) {
      throw new MappingReleaseRequestError(
        'rejected',
        message ?? 'A API recusou a operação fiscal.'
      );
    }
    if (!error.response || status === 503 || (status !== undefined && status >= 500)) {
      throw new MappingReleaseRequestError(
        'unavailable',
        'O serviço fiscal está temporariamente indisponível.'
      );
    }
  }
  throw new MappingReleaseRequestError(
    'request_failed',
    'Não foi possível concluir a operação fiscal.'
  );
}

export const mappingReleaseService = {
  async compileDraft(workspaceId: string, draftId: string): Promise<MappingCompileJob> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/compile`
      );
      return parseJob({
        releaseId: null,
        error: null,
        durationMs: null,
        ...(isRecord(response.data) ? response.data : {}),
      });
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getCompileJob(
    workspaceId: string,
    draftId: string,
    jobId: string
  ): Promise<MappingCompileJob> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const job = resourceSegment(jobId, 'Job');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/compile/${job}`
      );
      return parseJob(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getRelease(
    workspaceId: string,
    draftId: string,
    releaseId: string
  ): Promise<MappingRelease> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const release = resourceSegment(releaseId, 'Release');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/releases/${release}`
      );
      return parseRelease(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async createTestRun(input: CreateMappingTestRunInput): Promise<MappingTestRunJob> {
    const workspace = resourceSegment(input.workspaceId, 'Workspace');
    const draft = resourceSegment(input.draftId, 'Draft');
    const releaseId = input.releaseId.trim();
    if (!releaseId || !input.inputXml.trim() || !input.expectedXml.trim()) {
      throw new MappingReleaseRequestError(
        'invalid_input',
        'Release, XML de entrada e XML esperado são obrigatórios.'
      );
    }

    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-runs`,
        {
          releaseId,
          inputXml: input.inputXml,
          expectedXml: input.expectedXml,
          ...(input.xsdVersion?.trim() ? { xsdVersion: input.xsdVersion.trim() } : {}),
        }
      );
      return parseTestJob({
        releaseId,
        requiredGatesPassed: null,
        error: null,
        durationMs: null,
        ...(isRecord(response.data) ? response.data : {}),
      });
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getTestRunJob(
    workspaceId: string,
    draftId: string,
    jobId: string
  ): Promise<MappingTestRunJob> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const job = resourceSegment(jobId, 'Job');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/test-runs/${job}`
      );
      return parseTestJob(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async approveRelease(
    workspaceId: string,
    releaseId: string,
    justification: string
  ): Promise<MappingGovernanceSnapshot> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const release = resourceSegment(releaseId, 'Release');
    const normalizedJustification = justification.trim();
    if (!normalizedJustification) {
      throw new MappingReleaseRequestError(
        'invalid_input',
        'A justificativa é obrigatória para aprovar a release.'
      );
    }
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-releases/${release}/approve`,
        { justification: normalizedJustification }
      );
      return assertGovernanceResource(
        parseGovernanceSnapshot(response.data, 'approved'),
        workspaceId,
        releaseId
      );
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async publishRelease(
    workspaceId: string,
    releaseId: string,
    environment: MappingGovernanceEnvironment
  ): Promise<MappingGovernanceSnapshot> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const release = resourceSegment(releaseId, 'Release');
    if (!governanceEnvironments.has(environment)) {
      throw new MappingReleaseRequestError(
        'invalid_input',
        'Selecione um ambiente de publicação suportado.'
      );
    }
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-releases/${release}/publish`,
        { environment }
      );
      return assertGovernanceResource(
        parseGovernanceSnapshot(response.data, 'published'),
        workspaceId,
        releaseId
      );
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async rollbackRelease(
    workspaceId: string,
    releaseId: string
  ): Promise<MappingGovernanceSnapshot> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const release = resourceSegment(releaseId, 'Release');
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-releases/${release}/rollback`
      );
      return assertGovernanceResource(
        parseGovernanceSnapshot(response.data, 'deprecated'),
        workspaceId,
        releaseId
      );
    } catch (error) {
      return mapRequestError(error);
    }
  },
};
