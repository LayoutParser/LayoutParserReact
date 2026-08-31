import type {
  AnalysisFilters,
  CurrentWorkspacesResponse,
  CursorPage,
  DocumentAnalysisSummary,
  MappingExplanation,
} from '../../types/workspace';
import apiClient from '../api';

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
    const response = await apiClient.get<CurrentWorkspacesResponse>('/api/workspaces/me');
    return response.data;
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
