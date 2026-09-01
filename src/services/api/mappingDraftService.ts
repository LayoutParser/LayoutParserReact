import axios from 'axios';
import type {
  CreateMappingDraftInput,
  MappingAuthoringEngine,
  MappingDraft,
  MappingDraftEvidence,
  MappingDraftRule,
  MappingDraftRuleStatus,
  MappingSuggestionJob,
  MappingSuggestionJobStatus,
  UpdateMappingDraftRuleInput,
} from '../../types/mappingDraft';
import apiClient from '../api';

const authoringEngines = new Set<MappingAuthoringEngine>(['tcl', 'xslt']);
const ruleStatuses = new Set<MappingDraftRuleStatus>([
  'proposed',
  'accepted',
  'edited',
  'rejected',
  'needs_input',
  'validated',
  'superseded',
]);
const jobStatuses = new Set<MappingSuggestionJobStatus>([
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
]);

export type MappingDraftRequestErrorKind =
  | 'invalid_input'
  | 'invalid_response'
  | 'unauthorized'
  | 'not_found'
  | 'conflict'
  | 'precondition'
  | 'rejected'
  | 'unavailable'
  | 'request_failed';

export class MappingDraftRequestError extends Error {
  readonly kind: MappingDraftRequestErrorKind;
  readonly currentRule: MappingDraftRule | null;

  constructor(
    kind: MappingDraftRequestErrorKind,
    message: string,
    currentRule: MappingDraftRule | null = null
  ) {
    super(message);
    this.name = 'MappingDraftRequestError';
    this.kind = kind;
    this.currentRule = currentRule;
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

function resourceSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new MappingDraftRequestError('invalid_input', `${label} é obrigatório.`);
  }
  return encodeURIComponent(normalized);
}

function invalidResponse(): MappingDraftRequestError {
  return new MappingDraftRequestError(
    'invalid_response',
    'A API devolveu um rascunho de mapping inválido.'
  );
}

function parseEvidence(value: unknown): MappingDraftEvidence {
  if (!isRecord(value) || !isNonEmptyString(value.kind) || !isNonEmptyString(value.reference)) {
    throw invalidResponse();
  }
  return value as unknown as MappingDraftEvidence;
}

function parseRule(value: unknown): MappingDraftRule {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.ruleId) ||
    !isNonEmptyString(value.draftId) ||
    !isStringArray(value.sourceRefs) ||
    !isStringArray(value.targetRefs) ||
    !isNonEmptyString(value.operation) ||
    typeof value.conditions !== 'string' ||
    typeof value.transformations !== 'string' ||
    !isNonEmptyString(value.cardinality) ||
    !Array.isArray(value.evidence) ||
    !isNonEmptyString(value.confidence) ||
    !isNonEmptyString(value.status) ||
    !ruleStatuses.has(value.status as MappingDraftRuleStatus) ||
    !isStringArray(value.questions) ||
    !isValidDate(value.createdAt) ||
    !isNonEmptyString(value.eTag)
  ) {
    throw invalidResponse();
  }

  return {
    ruleId: value.ruleId,
    draftId: value.draftId,
    sourceRefs: value.sourceRefs,
    targetRefs: value.targetRefs,
    operation: value.operation,
    conditions: value.conditions,
    transformations: value.transformations,
    cardinality: value.cardinality,
    evidence: value.evidence.map(parseEvidence),
    confidence: value.confidence,
    status: value.status as MappingDraftRuleStatus,
    questions: value.questions,
    createdAt: value.createdAt,
    eTag: value.eTag,
  };
}

function parseDraft(value: unknown): MappingDraft {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.draftId) ||
    !isNonEmptyString(value.workspaceId) ||
    !isNonEmptyString(value.packageId) ||
    !isNonEmptyString(value.revisionId) ||
    !isNonEmptyString(value.engine) ||
    !authoringEngines.has(value.engine as MappingAuthoringEngine) ||
    !isValidDate(value.createdAt) ||
    !Array.isArray(value.rules)
  ) {
    throw invalidResponse();
  }

  const rules = value.rules.map(parseRule);
  if (rules.some(rule => rule.draftId !== value.draftId)) {
    throw invalidResponse();
  }

  return {
    draftId: value.draftId,
    workspaceId: value.workspaceId,
    packageId: value.packageId,
    revisionId: value.revisionId,
    engine: value.engine as MappingAuthoringEngine,
    createdAt: value.createdAt,
    rules,
  };
}

function parseJob(value: unknown): MappingSuggestionJob {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.jobId) ||
    !isNonEmptyString(value.status) ||
    !jobStatuses.has(value.status as MappingSuggestionJobStatus) ||
    (value.rulesCreated !== undefined &&
      (typeof value.rulesCreated !== 'number' ||
        !Number.isSafeInteger(value.rulesCreated) ||
        value.rulesCreated < 0)) ||
    (value.error !== undefined && !isNullableString(value.error))
  ) {
    throw invalidResponse();
  }

  return {
    jobId: value.jobId,
    status: value.status as MappingSuggestionJobStatus,
    ...(value.rulesCreated === undefined ? {} : { rulesCreated: value.rulesCreated as number }),
    ...(value.error === undefined ? {} : { error: value.error as string | null }),
  };
}

function responseMessage(data: unknown): string | null {
  return isRecord(data) && isNonEmptyString(data.error) ? data.error : null;
}

function mapRequestError(error: unknown): never {
  if (error instanceof MappingDraftRequestError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = responseMessage(error.response?.data);
    if (status === 401 || status === 403) {
      throw new MappingDraftRequestError(
        'unauthorized',
        'Sua sessão não permite revisar mappings neste workspace.'
      );
    }
    if (status === 404) {
      throw new MappingDraftRequestError(
        'not_found',
        'O draft, pacote ou workspace não foi encontrado para esta identidade.'
      );
    }
    if (status === 412) {
      const current = isRecord(error.response?.data) ? error.response.data.current : null;
      let currentRule: MappingDraftRule | null = null;
      if (current !== null && current !== undefined) {
        try {
          currentRule = parseRule(current);
        } catch {
          currentRule = null;
        }
      }
      throw new MappingDraftRequestError(
        'conflict',
        message ?? 'A regra mudou em outra sessão. O estado atual foi recarregado.',
        currentRule
      );
    }
    if (status === 428) {
      throw new MappingDraftRequestError(
        'precondition',
        message ?? 'A API exigiu uma versão atual da regra para salvar.'
      );
    }
    if (status === 400 || status === 422) {
      throw new MappingDraftRequestError(
        'rejected',
        message ?? 'A API recusou a alteração proposta para o mapping.'
      );
    }
    if (!error.response || status === 503 || (status !== undefined && status >= 500)) {
      throw new MappingDraftRequestError(
        'unavailable',
        'O serviço de revisão de mappings está temporariamente indisponível.'
      );
    }
  }

  throw new MappingDraftRequestError(
    'request_failed',
    'Não foi possível concluir a operação no Mapping Studio.'
  );
}

export const mappingDraftService = {
  async createDraft(input: CreateMappingDraftInput): Promise<MappingDraft> {
    const workspace = resourceSegment(input.workspaceId, 'Workspace');
    const packageId = resourceSegment(input.packageId, 'Pacote');
    const revisionId = resourceSegment(input.revisionId, 'Revisão');
    if (!authoringEngines.has(input.engine)) {
      throw new MappingDraftRequestError(
        'invalid_input',
        'Somente TCL e XSLT podem possuir drafts de autoria.'
      );
    }

    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-packages/${packageId}/drafts`,
        { revisionId: decodeURIComponent(revisionId), engine: input.engine }
      );
      return parseDraft(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getDraft(workspaceId: string, draftId: string): Promise<MappingDraft> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}`
      );
      return parseDraft(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async createSuggestion(workspaceId: string, draftId: string): Promise<MappingSuggestionJob> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    try {
      const response = await apiClient.post<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/suggestions`
      );
      return parseJob(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async getSuggestion(
    workspaceId: string,
    draftId: string,
    jobId: string
  ): Promise<MappingSuggestionJob> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const job = resourceSegment(jobId, 'Job');
    try {
      const response = await apiClient.get<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/suggestions/${job}`
      );
      return parseJob(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async cancelSuggestion(workspaceId: string, draftId: string, jobId: string): Promise<void> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const draft = resourceSegment(draftId, 'Draft');
    const job = resourceSegment(jobId, 'Job');
    try {
      await apiClient.delete(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/suggestions/${job}`
      );
    } catch (error) {
      return mapRequestError(error);
    }
  },

  async updateRule(input: UpdateMappingDraftRuleInput): Promise<MappingDraftRule> {
    const workspace = resourceSegment(input.workspaceId, 'Workspace');
    const draft = resourceSegment(input.draftId, 'Draft');
    const rule = resourceSegment(input.ruleId, 'Regra');
    if (!isNonEmptyString(input.eTag)) {
      throw new MappingDraftRequestError(
        'invalid_input',
        'A versão atual da regra é obrigatória para salvar.'
      );
    }

    const body = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.justification?.trim() ? { justification: input.justification.trim() } : {}),
      ...(input.sourceRefs ? { sourceRefs: input.sourceRefs } : {}),
      ...(input.targetRefs ? { targetRefs: input.targetRefs } : {}),
      ...(input.operation?.trim() ? { operation: input.operation.trim() } : {}),
      ...(input.answer?.trim() ? { answer: input.answer.trim() } : {}),
    };

    try {
      const response = await apiClient.patch<unknown>(
        `/api/workspaces/${workspace}/mapping-drafts/${draft}/rules/${rule}`,
        body,
        { headers: { 'If-Match': `\"${input.eTag.trim().replace(/^\"|\"$/g, '')}\"` } }
      );
      return parseRule(response.data);
    } catch (error) {
      return mapRequestError(error);
    }
  },
};
