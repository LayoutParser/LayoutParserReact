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
