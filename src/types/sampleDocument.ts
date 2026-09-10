// Tipos para "Gerar documento de exemplo" a partir de um layout já cadastrado.
//
// Contrato de referência (LayoutParserApi#355/#356) — AINDA NÃO implantado em produção:
//   POST /api/layouts/{layoutGuid}/generate-sample
//     body: { numberOfRecords?: int (default 1), seed?: int }
//     response: { generatedDocument: string, format: "xml" | "positional", warnings: string[] }
//     400 — layoutGuid desconhecido
//     404 — layout existe mas NÃO tem mapper (TCL/XSL/XSLT) vinculado ainda
//
// `sampleDocumentService.ts` implementa este contrato hoje por trás de um MOCK (issue #241);
// quando a API subir, o único ponto de troca é o corpo de `generateSampleDocument` naquele
// arquivo.

export interface GenerateSampleDocumentRequest {
  numberOfRecords?: number;
  seed?: number;
}

export type SampleDocumentFormat = 'xml' | 'positional';

export interface GenerateSampleDocumentResponse {
  generatedDocument: string;
  format: SampleDocumentFormat;
  warnings: string[];
}

/**
 * Causa de falha ao gerar o documento de exemplo, já classificada para a UI (issue #239).
 * `unknown_layout` = 400 (layoutGuid desconhecido); `no_mapper` = 404 (layout sem mapeador
 * TCL/XSL/XSLT vinculado); os demais são falha de transporte/infraestrutura.
 */
export type GenerateSampleDocumentErrorKind =
  'unknown_layout' | 'no_mapper' | 'network_error' | 'server_error';

export interface GenerateSampleDocumentErrorInfo {
  kind: GenerateSampleDocumentErrorKind;
  message: string;
  httpStatus?: number;
}
