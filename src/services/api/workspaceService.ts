import axios from 'axios';
import type {
  AnalysisFilters,
  CurrentWorkspacesResponse,
  CursorPage,
  DocumentAnalysisSummary,
  FiscalWorkspaceSummary,
  MappingExplanation,
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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
    const response = await apiClient.get<CursorPage<DocumentAnalysisSummary>>(
      `/api/workspaces/${workspace}/projects/${project}/analyses`,
      { params: filters }
    );
    return response.data;
  },

  async getMappingExplanation(
    workspaceId: string,
    mappingId: string,
    version: number
  ): Promise<MappingExplanation> {
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error('Versão do mapping deve ser um inteiro positivo.');
    }

    const workspace = resourceSegment(workspaceId, 'Workspace');
    const mapping = resourceSegment(mappingId, 'Mapping');
    const response = await apiClient.get<MappingExplanation>(
      `/api/workspaces/${workspace}/mappings/${mapping}/versions/${version}/explanation`
    );
    return response.data;
  },
};
