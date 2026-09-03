import axios from 'axios';
import type {
  AnalysisFilters,
  CurrentWorkspacesResponse,
  CursorPage,
  DocumentAnalysisSummary,
  FiscalWorkspaceSummary,
  MappingEngine,
  MappingEngineCapabilities,
  MappingEvidenceReference,
  MappingExplanation,
  MappingRuleExplanation,
  MappingSchemaReference,
  MappingSupportLevel,
} from '../../types/workspace';
import apiClient from '../api';

type WorkspaceRequestErrorKind =
  'unauthorized' | 'unavailable' | 'invalid_response' | 'request_failed';

export class WorkspaceRequestError extends Error {
  readonly kind: WorkspaceRequestErrorKind;

  constructor(kind: WorkspaceRequestErrorKind, message: string) {
    super(message);
    this.name = 'WorkspaceRequestError';
    this.kind = kind;
  }
}

const workspaceKinds = new Set(['personal', 'organization']);
const workspaceRoles = new Set([
  'owner',
  'fiscal_admin',
  'mapper',
  'reviewer',
  'operator',
  'viewer',
]);
const mappingEngines = new Set<MappingEngine>(['tcl', 'xslt', 'sysmiddle']);
const mappingSupportLevels = new Set<MappingSupportLevel>([
  'authoritative',
  'best_effort',
  'opaque',
  'unsupported',
]);

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

function invalidExplanation(): WorkspaceRequestError {
  return new WorkspaceRequestError(
    'invalid_response',
    'A API devolveu uma explicação de mapping inválida.'
  );
}

function parseCapabilities(value: unknown): MappingEngineCapabilities {
  if (
    !isRecord(value) ||
    typeof value.execute !== 'boolean' ||
    typeof value.explain !== 'boolean' ||
    typeof value.author !== 'boolean' ||
    typeof value.compile !== 'boolean' ||
    typeof value.publish !== 'boolean'
  ) {
    throw invalidExplanation();
  }

  return value as unknown as MappingEngineCapabilities;
}

function parseSchema(value: unknown): MappingSchemaReference | null {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    !isNullableString(value.layoutGuid) ||
    !isNullableString(value.description)
  ) {
    throw invalidExplanation();
  }
  return value as unknown as MappingSchemaReference;
}

function parseEvidence(value: unknown): MappingEvidenceReference {
  if (!isRecord(value) || !isNonEmptyString(value.kind) || !isNonEmptyString(value.reference)) {
    throw invalidExplanation();
  }
  return value as unknown as MappingEvidenceReference;
}

function parseExplainedRule(value: unknown): MappingRuleExplanation {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.ruleId) ||
    !isStringArray(value.sourceRefs) ||
    !isStringArray(value.targetRefs) ||
    !isNullableString(value.condition) ||
    !isStringArray(value.operations) ||
    !isNonEmptyString(value.cardinality) ||
    !Array.isArray(value.evidence) ||
    !isNonEmptyString(value.humanDescription) ||
    !isNullableString(value.technicalDetail) ||
    !isNonEmptyString(value.supportLevel) ||
    !mappingSupportLevels.has(value.supportLevel as MappingSupportLevel)
  ) {
    throw invalidExplanation();
  }

  return {
    ruleId: value.ruleId,
    sourceRefs: value.sourceRefs,
    targetRefs: value.targetRefs,
    condition: value.condition,
    operations: value.operations,
    cardinality: value.cardinality,
    evidence: value.evidence.map(parseEvidence),
    humanDescription: value.humanDescription,
    technicalDetail: value.technicalDetail,
    supportLevel: value.supportLevel as MappingSupportLevel,
  };
}

function parseMappingExplanation(value: unknown): MappingExplanation {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.mappingId) ||
    !isNonEmptyString(value.version) ||
    !isNonEmptyString(value.engine) ||
    !mappingEngines.has(value.engine as MappingEngine) ||
    !Array.isArray(value.rules) ||
    !isNullableString(value.description) ||
    !isStringArray(value.limitations) ||
    typeof value.opaqueRuleCount !== 'number' ||
    !Number.isSafeInteger(value.opaqueRuleCount) ||
    value.opaqueRuleCount < 0
  ) {
    throw invalidExplanation();
  }

  const engine = value.engine as MappingEngine;
  const capabilities = parseCapabilities(value.capabilities);

  // O cliente não confia em capabilities mutáveis para Sysmiddle. Além de esconder controles,
  // recusamos o payload inteiro para que uma resposta adulterada não seja exibida como capacidade
  // legítima em deep link, cache intermediário ou estado reidratado.
  if (
    engine === 'sysmiddle' &&
    (capabilities.author || capabilities.compile || capabilities.publish)
  ) {
    throw invalidExplanation();
  }

  return {
    mappingId: value.mappingId,
    version: value.version,
    engine,
    capabilities,
    sourceSchema: parseSchema(value.sourceSchema),
    targetSchema: parseSchema(value.targetSchema),
    rules: value.rules.map(parseExplainedRule),
    description: value.description,
    limitations: value.limitations,
    opaqueRuleCount: value.opaqueRuleCount,
  };
}

function parseCurrentWorkspaces(data: unknown): CurrentWorkspacesResponse {
  if (typeof data !== 'object' || data === null) {
    throw new WorkspaceRequestError('invalid_response', 'A API devolveu um workspace inválido.');
  }

  const candidate = data as Record<string, unknown>;
  if (!isNonEmptyString(candidate.activeWorkspaceId) || !Array.isArray(candidate.workspaces)) {
    throw new WorkspaceRequestError('invalid_response', 'A API devolveu um workspace inválido.');
  }

  const workspaces: FiscalWorkspaceSummary[] = candidate.workspaces.map(item => {
    if (typeof item !== 'object' || item === null) {
      throw new WorkspaceRequestError('invalid_response', 'A API devolveu um workspace inválido.');
    }

    const workspace = item as Record<string, unknown>;
    if (
      !isNonEmptyString(workspace.workspaceId) ||
      !isNonEmptyString(workspace.name) ||
      !isNonEmptyString(workspace.kind) ||
      !workspaceKinds.has(workspace.kind) ||
      !isNonEmptyString(workspace.role) ||
      !workspaceRoles.has(workspace.role) ||
      !isNonEmptyString(workspace.createdAt) ||
      Number.isNaN(Date.parse(workspace.createdAt))
    ) {
      throw new WorkspaceRequestError('invalid_response', 'A API devolveu um workspace inválido.');
    }

    return workspace as unknown as FiscalWorkspaceSummary;
  });

  const uniqueIds = new Set(workspaces.map(workspace => workspace.workspaceId));
  if (
    workspaces.length === 0 ||
    uniqueIds.size !== workspaces.length ||
    !uniqueIds.has(candidate.activeWorkspaceId)
  ) {
    throw new WorkspaceRequestError('invalid_response', 'A API devolveu um workspace inválido.');
  }

  return {
    activeWorkspaceId: candidate.activeWorkspaceId,
    workspaces,
  };
}

function resourceSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} é obrigatório.`);
  }
  return encodeURIComponent(normalized);
}

/**
 * Contrato P0 do workspace fiscal. A API continua sendo a fonte da verdade; este service não
 * persiste histórico ou documento no navegador.
 */
export const workspaceService = {
  async getCurrentWorkspaces(): Promise<CurrentWorkspacesResponse> {
    try {
      const response = await apiClient.get<unknown>('/api/workspaces/me');
      return parseCurrentWorkspaces(response.data);
    } catch (error) {
      if (error instanceof WorkspaceRequestError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          throw new WorkspaceRequestError(
            'unauthorized',
            'Sua sessão não permite acessar este workspace.'
          );
        }
        if (!error.response || status === 503 || (status !== undefined && status >= 500)) {
          throw new WorkspaceRequestError(
            'unavailable',
            'O serviço de workspaces está temporariamente indisponível.'
          );
        }
      }

      throw new WorkspaceRequestError(
        'request_failed',
        'Não foi possível carregar seu workspace fiscal.'
      );
    }
  },

  async listAnalyses(
    workspaceId: string,
    projectId: string,
    filters: AnalysisFilters = {}
  ): Promise<CursorPage<DocumentAnalysisSummary>> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const project = resourceSegment(projectId, 'Projeto');
    try {
      const response = await apiClient.get<CursorPage<DocumentAnalysisSummary>>(
        `/api/workspaces/${workspace}/projects/${project}/analyses`,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          throw new WorkspaceRequestError(
            'unauthorized',
            'Sua sessão não permite acessar as análises deste projeto.'
          );
        }
        if (!error.response || status === 503 || (status !== undefined && status >= 500)) {
          throw new WorkspaceRequestError(
            'unavailable',
            'O histórico de análises está temporariamente indisponível.'
          );
        }
      }

      throw new WorkspaceRequestError(
        'request_failed',
        'Não foi possível carregar o histórico de análises deste projeto.'
      );
    }
  },

  async getMappingExplanation(
    workspaceId: string,
    mappingId: string,
    version: string
  ): Promise<MappingExplanation> {
    const workspace = resourceSegment(workspaceId, 'Workspace');
    const mapping = resourceSegment(mappingId, 'Mapping');
    const mappingVersion = resourceSegment(version, 'Versão do mapping');
    const response = await apiClient.get<unknown>(
      `/api/workspaces/${workspace}/mappings/${mapping}/versions/${mappingVersion}/explanation`
    );
    return parseMappingExplanation(response.data);
  },
};
