import axios from 'axios';
import apiClient from '../api';
import type {
  AiCandidateStatus,
  FieldMapping,
  FieldMappingConfidence,
  FieldMappingKind,
  FieldMappingNodeKind,
  TransformationCandidate,
  TransformationCandidatesRequest,
  TransformationCandidatesResponse,
} from '../../types/transformation';

const FIELD_MAPPING_KINDS: FieldMappingKind[] = ['Direct', 'Transformed', 'Concatenated', 'Static'];
const FIELD_MAPPING_CONFIDENCES: FieldMappingConfidence[] = ['Authoritative', 'BestEffort'];
const FIELD_MAPPING_NODE_KINDS: FieldMappingNodeKind[] = ['Element', 'Attribute', 'Text'];

const normalizeEnum = <T extends string>(
  value: T | number,
  values: readonly T[],
  fallback: T
): T => {
  if (typeof value === 'number') return values[value] ?? fallback;
  return values.find(candidate => candidate.toLowerCase() === value.toLowerCase()) ?? fallback;
};

type FieldMappingWire = Omit<FieldMapping, 'kind' | 'confidence' | 'targets' | 'limitations'> & {
  kind: FieldMappingKind | number;
  confidence: FieldMappingConfidence | number;
  limitations?: string[] | null;
  targets: Array<
    Omit<FieldMapping['targets'][number], 'nodeKind' | 'xmlOccurrence'> & {
      nodeKind: FieldMappingNodeKind | number;
      xmlOccurrence?: number | null;
    }
  >;
};

type TransformationCandidateWire = Omit<TransformationCandidate, 'fieldMappings'> & {
  fieldMappings?: FieldMappingWire[] | null;
};

type TransformationCandidatesWireResponse = Omit<
  TransformationCandidatesResponse,
  'candidates' | 'recommendedCandidateId' | 'warnings' | 'pathwayDiagnostics' | 'correlationId'
> & {
  candidates: TransformationCandidateWire[];
  recommendedCandidateId?: string | null;
  warnings?: string[];
  pathwayDiagnostics?: TransformationCandidatesResponse['pathwayDiagnostics'];
  correlationId?: string | null;
};

const normalizeFieldMapping = (mapping: FieldMappingWire): FieldMapping => ({
  ...mapping,
  kind: normalizeEnum(mapping.kind, FIELD_MAPPING_KINDS, 'Transformed'),
  confidence: normalizeEnum(mapping.confidence, FIELD_MAPPING_CONFIDENCES, 'BestEffort'),
  limitations: mapping.limitations ?? null,
  targets: mapping.targets.map(target => ({
    ...target,
    nodeKind: normalizeEnum(target.nodeKind, FIELD_MAPPING_NODE_KINDS, 'Element'),
    xmlOccurrence: target.xmlOccurrence ?? null,
  })),
});

const normalizeCandidate = (candidate: TransformationCandidateWire): TransformationCandidate => ({
  ...candidate,
  segmentMappings: candidate.segmentMappings ?? null,
  fieldMappings:
    candidate.fieldMappings === undefined || candidate.fieldMappings === null
      ? null
      : candidate.fieldMappings.map(normalizeFieldMapping),
  sectionMappings: candidate.sectionMappings ?? null,
  xmlNamespaces: candidate.xmlNamespaces ?? null,
  score: candidate.score ?? null,
  validation: candidate.validation ?? null,
  failureReason: candidate.failureReason ?? null,
});

/**
 * Serviço para o fluxo "XML Transformação Final": executa a avaliação multi-candidato e a
 * transformação (validação + geração de XML) pelos pathways Sysmiddle e TCL/XSL.
 *
 * Rotas validadas em 2026-07-20 contra um ambiente de integração da API:
 * - POST /api/transformationexecution/execute-candidates -> ver types/transformation.ts
 * - GET /api/transformationexecution/execute-candidates/{ticket}/ia-status -> polling do
 *   fallback automático de IA (issue #140), ver types/transformation.ts
 */
export const transformationService = {
  /**
   * Executa a transformação e devolve TODOS os caminhos possíveis (multi-candidato), em vez
   * de assumir um único resultado. Esta rota sempre responde 200 em sucesso — mesmo com
   * `candidates: []` (zero candidatos é estado válido, não falha), então não há um shape de
   * "falha de negócio" paralelo aqui: qualquer exceção lançada é infraestrutura (rede, 5xx)
   * e vira `Error`.
   */
  async executeTransformationCandidates(
    request: TransformationCandidatesRequest
  ): Promise<TransformationCandidatesResponse> {
    try {
      const response = await apiClient.post<TransformationCandidatesWireResponse>(
        '/api/transformationexecution/execute-candidates',
        request
      );
      return {
        ...response.data,
        candidates: response.data.candidates.map(normalizeCandidate),
        recommendedCandidateId: response.data.recommendedCandidateId ?? null,
        warnings: response.data.warnings ?? [],
        pathwayDiagnostics: response.data.pathwayDiagnostics ?? [],
        correlationId: response.data.correlationId ?? null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        throw new Error(
          data?.error || error.message || 'Erro ao executar transformação XML (multi-candidato)'
        );
      }
      throw error;
    }
  },

  /**
   * Consulta o status do job de IA em background (fallback automático quando nenhum candidato
   * síncrono foi encontrado). Ticket de outro usuário devolve 404 da própria API (nunca 403) —
   * tratamos isso como `status: 'not-found'` em vez de propagar a exceção, já que é um estado
   * terminal esperado do polling, não uma falha de infraestrutura.
   */
  async getAiCandidateStatus(ticket: string): Promise<AiCandidateStatus> {
    try {
      const response = await apiClient.get<AiCandidateStatus>(
        `/api/transformationexecution/execute-candidates/${encodeURIComponent(ticket)}/ia-status`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return { status: 'not-found', candidate: null, diagnostics: null };
        }
        const data = error.response?.data;
        throw new Error(
          data?.error || error.message || 'Erro ao consultar status do fallback de IA'
        );
      }
      throw error;
    }
  },
};
