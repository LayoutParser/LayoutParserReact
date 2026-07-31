// Tipos para o painel de métricas de IA (Gap 3).
//
// Contrato publicado por @lp-architect (Aria) em 2026-07-30, AINDA NÃO implementado pelo
// back-end (LayoutParserApi) — endpoints vão devolver 404/erro de conexão até o back-end
// subir. Front trabalha em paralelo apontando já para o contrato final; ver aiMetricsService.ts.

/**
 * Um item de geração de IA (uma execução do modelo para um layout específico).
 * GET /api/ai-metrics/generations
 */
export interface AiGeneration {
  layout: string;
  docType: string; // já vem derivado do back-end — não fazer parsing de `layout` no front
  modelo: string;
  timestamp: string;
  tokensPorSegundo: number;
  tamanhoPromptChars: number;
  duracaoSegundos: number;
  similaridadeFewShot: number;
  tagOverlapRatio: number;
  textSimilarityRatio: number;
  // null = fase do pipeline ainda não implementada (pendente/não avaliado) — NUNCA tratar
  // como falha. true/false só passam a ter significado quando o back-end ligar essas fases.
  xsdValido: boolean | null;
  cypressValidado: boolean | null;
  cStatPollux: boolean | null;
  // sucesso = Ollama retornou saída utilizável (não confundir com qualidade da saída, que é
  // medida por tagOverlapRatio/textSimilarityRatio).
  sucesso: boolean;
}

export interface AiGenerationsResponse {
  success: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  items: AiGeneration[];
}

/** Filtros opcionais aceitos por GET /api/ai-metrics/generations. */
export interface AiGenerationsFilters {
  page?: number;
  pageSize?: number;
  layout?: string;
  modelo?: string;
  sucesso?: boolean;
  de?: string; // ISO date
  ate?: string; // ISO date
}

/** Agregado por tipo de documento dentro do resumo. */
export interface AiMetricsSummaryByDocType {
  docType: string;
  total: number;
  sucesso: number;
  tokensPorSegundoMedio: number;
}

/**
 * Resumo agregado de métricas de IA. GET /api/ai-metrics/summary
 *
 * `totalXsdValidado`/`totalCypressValidado`/`totalCStatAutorizado` ficam em 0 até as fases
 * correspondentes do pipeline existirem — tratar como "pendente", não como erro/regressão.
 * `ultimaRodada` deve aparecer na UI para comunicar que o job de geração está vivo.
 */
export interface AiMetricsSummary {
  success: boolean;
  totalGeracoes: number;
  totalSucesso: number;
  totalFalhas: number;
  tokensPorSegundoMedio: number;
  tagOverlapMedio: number;
  textSimilarityMedia: number;
  totalXsdValidado: number;
  totalCypressValidado: number;
  totalCStatAutorizado: number;
  porDocType: AiMetricsSummaryByDocType[];
  ultimaRodada: string;
}

/** Filtros opcionais aceitos por GET /api/ai-metrics/summary. */
export interface AiMetricsSummaryFilters {
  de?: string;
  ate?: string;
}
