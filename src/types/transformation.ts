// Tipos para o fluxo de "XML Transformação Final" (mapper + execução de transformação).
//
// Contrato validado contra um ambiente de integração da LayoutParserApi,
// não apenas por leitura do código C#. Fonte:
// - LayoutParserApi/Controllers/TransformationExecutionController.cs
//   (ExecuteTransformationCandidates)

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

// ---------------------------------------------------------------------------------------
// Fallback automático de IA para execute-candidates (issue #140). Quando nenhum candidato é
// encontrado pelos pathways síncronos, a API pode enfileirar um job de IA em background e
// sinalizar isso via texto livre em `TransformationCandidatesResponse.warnings` — não há campo
// estruturado dedicado. O resultado só existe via polling em GET .../{ticket}/ia-status.
// ---------------------------------------------------------------------------------------

/**
 * Candidato de transformação gerado pelo fallback de IA (Ollama).
 * `pathway` é sempre `'ia'` — distingue de `TransformationCandidate.pathway`
 * (`'sysmiddle' | 'tcl-xsl'`), que nunca inclui esse valor.
 */
export interface AiCandidate {
  candidateId: string;
  pathway: 'ia';
  transformedXml: string;
  score: number | null;
  segmentMappings: Record<string, string> | null;
  validation: unknown | null;
  failureReason: string | null;
}

/**
 * Diagnóstico do job de IA em `GET .../{ticket}/ia-status`.
 *
 * `hasGroundTruth` é o campo semântico mais importante: `false` significa que não havia
 * mapper Sysmiddle cadastrado para comparar (fallback automático "às cegas") — a convergência
 * então só significa XSD válido + validação de negócio, NUNCA diff canônico contra um gabarito
 * real. `remainingDiffs` fica 0 mesmo nesse caso; isso é estrutural (não há gabarito para
 * diferir), não um sinal de qualidade. Tratar como sugestão para revisão humana, nunca como
 * transformação pronta para produção.
 */
export interface AiCandidateDiagnostics {
  iterations: number;
  remainingDiffs: number;
  xsdValid: boolean;
  lastError: string | null;
  hasGroundTruth: boolean;
}

export type AiCandidateStatusValue =
  'running' | 'converged' | 'failed' | 'not-applicable' | 'not-found';

/**
 * Resposta de GET /api/transformationexecution/execute-candidates/{ticket}/ia-status.
 * `candidate` só vem preenchido quando `status === 'converged'`;
 * `diagnostics.lastError` só vem preenchido quando `status === 'failed'`.
 */
export interface AiCandidateStatus {
  status: AiCandidateStatusValue;
  candidate: AiCandidate | null;
  diagnostics: AiCandidateDiagnostics | null;
}
