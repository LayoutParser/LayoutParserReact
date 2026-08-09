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

/**
 * Request para POST /api/transformationexecution/execute.
 *
 * IMPORTANTE (confirmado batendo no endpoint real com corpo `{}`): o back-end valida via
 * model binding do ASP.NET Core que TODOS os campos abaixo estejam presentes no JSON —
 * inclusive os que a lógica de negócio trata como opcionais com fallback interno
 * (`sourceDocumentType`/`targetDocumentType` -> "NFe", `expectedOutput`). Omitir a chave
 * devolve 400 "The X field is required" antes de qualquer lógica rodar. Enviar string vazia
 * é aceito. Por isso aqui nenhum campo é opcional (`?`) — o service deve sempre enviar os 6.
 */
export interface TransformationExecutionRequest {
  inputContent: string;
  layoutName: string;
  sourceDocumentType: string; // enviar '' quando não aplicável (back-end usa fallback "NFe")
  targetDocumentType: string; // enviar '' quando não aplicável (back-end usa fallback "NFe")
  expectedOutput: string; // só relevante quando validate=true; enviar '' caso contrário
  validate: boolean;
}

/**
 * Resposta de sucesso de POST /api/transformationexecution/execute.
 * Shape confirmado por leitura do controller — o caminho de SUCESSO não foi exercitado em
 * runtime nesta validação (exigiria um documento de negócio real e válido para o layout
 * testado); o caminho de ERRO abaixo (`TransformationExecutionFailure`) foi confirmado.
 */
export interface TransformationExecutionSuccess {
  success: true;
  transformedXml: string;
  segmentMappings?: Record<string, string>; // Dictionary<int,string> no C# -> chaves string em JSON
  validation?: unknown; // shape de TransformationValidatorService não explorado; tratar como opaco por ora
}

/**
 * Resposta de erro de negócio (HTTP 400) — shape CONFIRMADO em runtime:
 * POST /api/transformationexecution/execute para um layout sem "arquivo MAP" gerado
 * devolveu exatamente `{ success: false, errors: [...], warnings: [] }`.
 */
export interface TransformationExecutionFailure {
  success: false;
  errors: string[];
  warnings: string[];
}

export type TransformationExecutionResponse =
  | TransformationExecutionSuccess
  | TransformationExecutionFailure;

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
