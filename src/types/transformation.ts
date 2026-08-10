// Tipos para o fluxo de "XML Transformação Final" (mapper + execução de transformação).
//
// Contrato validado em 2026-07-20 direto contra a API real (LayoutParserApi, ambiente
// 172.25.32.42:5000), não apenas por leitura do código C#. Fontes:
// - LayoutParserApi/Controllers/MapperDatabaseController.cs (GetMapperByInputLayoutGuid)
// - LayoutParserApi/Controllers/TransformationExecutionController.cs (ExecuteTransformation)
//
// O critério de negócio para exibir o botão "XML Transformação Final" é a EXISTÊNCIA de um
// Mapper cadastrado para o layoutGuid selecionado (não o campo `layoutType`, que na prática
// hoje vem sempre como código numérico string, ex.: "2", em todos os layouts reais testados).

/**
 * Mapeador encontrado para um layout de entrada.
 * GET /api/mapperdatabase/by-input/{layoutGuid} -> 200 com este shape quando existe
 * (confirmado em runtime). Quando não existe, a API responde 404 com { error: string }
 * (ver `MapperAvailability`, que já trata esse caso).
 */
export interface MapperInfo {
  success: boolean;
  id: number;
  mapperGuid: string;
  name: string;
  description: string;
  inputLayoutGuid: string;
  targetLayoutGuid: string;
  hasDecryptedContent: boolean;
  lastUpdateDate: string;
}

/**
 * Resultado (já tratado pelo front) da checagem "este layout tem transformação XML
 * disponível?". Não é o payload bruto da API: encapsula o 404 (mapeador não encontrado)
 * como `available: false`, em vez de propagar como erro.
 */
export interface MapperAvailability {
  available: boolean;
  mapper?: MapperInfo;
}

// Os tipos de POST /api/transformationexecution/execute (rota de candidato único) viviam
// aqui — Request, Success, Failure e a união Response. Saíram junto com
// `transformationService.executeTransformation` e com o slice de estado que o guardava: o
// front usa exclusivamente a rota multi-candidato (`execute-candidates`), logo abaixo.
// Se a rota de candidato único voltar a ser consumida, o contrato está no histórico do git.

// ---------------------------------------------------------------------------------------
// Multi-candidato de transformação (Gap 1) e diagnóstico de erro via IA (Gap 2).
// Contrato CONFIRMADO por handoff @lp-architect (Aria) em 2026-07-29, implementado por
// @lp-backend-dev (Dex) e @lp-parser-llm (Lia). Ver POST /api/transformationexecution/
// execute-candidates e POST /api/xml-analysis/diagnose-validation-error.
// ---------------------------------------------------------------------------------------

/**
 * Request para POST /api/transformationexecution/execute-candidates.
 * Idêntico ao request de `execute` (ver `TransformationExecutionRequest`), mas devolve todos
 * os caminhos de transformação possíveis em vez de um só.
 */
export interface TransformationCandidatesRequest {
  inputContent: string;
  layoutName: string;
  /**
   * GUID devolvido pelo parse, quando disponível. O back-end o prioriza porque o catálogo
   * legado pode devolver Guid.Empty mesmo quando o XML do layout contém um LAY_* válido.
   */
  layoutGuid: string | null;
  // O model binding da API exige a presença destes campos não anuláveis. Enviar string vazia
  // quando o fallback interno do back-end deve escolher o tipo de documento.
  sourceDocumentType: string;
  targetDocumentType: string;
  validate: boolean;
  expectedOutput: string;
}

/**
 * Um caminho de transformação possível para o mesmo input.
 *
 * - `candidateId` é previsível: "sysmiddle-{MapperGuid}" para o pathway Sysmiddle;
 *   "tclxsl-1" FIXO para o pathway TCL/XSL (esse pathway só produz 1 candidato — não iterar
 *   número dinâmico).
 * - `score` nunca vem preenchido de verdade ainda — NÃO ordenar por score; fallback é sempre
 *   o primeiro item do array até novo aviso do back-end.
 * - `validation` só vem preenchido no candidato tcl-xsl; `null` no sysmiddle NÃO é erro (esse
 *   pathway ainda não tem validação XSD).
 * - Um candidato que falha parcialmente não aparece no array (nunca `transformedXml: null`);
 *   o motivo vai em `warnings` da response (texto livre) ou em `failureReason` quando o
 *   candidato existe mas com problema reportável.
 */
export interface TransformationCandidate {
  candidateId: string;
  pathway: 'sysmiddle' | 'tcl-xsl';
  transformedXml: string;
  score: number | null;
  segmentMappings: Record<string, string>;
  validation: unknown | null; // shape não explorado; tratar como opaco (mesmo critério do `execute`)
  failureReason: string | null;
}

/**
 * Resposta de POST /api/transformationexecution/execute-candidates.
 * Zero candidatos é SUCESSO (200, `candidates: []` + `warnings` explicando o motivo) —
 * tratar como estado vazio da UI, nunca como falha de rede.
 */
export interface TransformationCandidatesResponse {
  success: true;
  candidates: TransformationCandidate[];
  recommendedCandidateId: string | null;
  warnings: string[];
}

/**
 * Request para POST /api/xml-analysis/diagnose-validation-error.
 * Só `errorMessage` é obrigatório; os demais ajudam o modelo (Ollama local) a contextualizar
 * o diagnóstico.
 */
export interface DiagnoseValidationErrorRequest {
  errorMessage: string;
  fieldName: string | null;
  mqSeriesSegment: string | null;
  documentType: string | null;
  transformedXml: string | null;
}

/**
 * Diagnóstico gerado por IA (Ollama local) para um erro de validação.
 * `confidence` (0.0–1.0) baixo NUNCA é erro HTTP — é só um número baixo; a UI deve tratar
 * como "diagnóstico com baixa certeza", não como falha.
 */
export interface ValidationDiagnostic {
  summary: string;
  suggestedFix: string | null;
  confidence: number;
}

export interface DiagnoseValidationErrorResponse {
  success: true;
  diagnostic: ValidationDiagnostic;
}

/**
 * Status HTTP de erro possíveis para o diagnóstico via IA (ver serviço para o texto amigável
 * de cada um). 400 = errorMessage vazio; 503 = Ollama indisponível; 504 = timeout do modelo;
 * 500 = erro de infraestrutura genérico.
 *
 * ⚠️ Este endpoint é POTENCIALMENTE LENTO: o caminho feliz (200) só foi validado isoladamente
 * contra Ollama real, não end-to-end — chamada estourou ~150s em ambiente CPU-only sem GPU.
 * A UI deve comunicar isso explicitamente (loading claro, não spinner de 2-3s) e não travar
 * o restante do fluxo enquanto aguarda.
 */
export type DiagnoseValidationErrorStatus = 400 | 503 | 504 | 500;

export interface DiagnoseValidationErrorFailure {
  status: DiagnoseValidationErrorStatus;
  message: string;
}
