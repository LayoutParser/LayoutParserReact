import type {
  GenerateSampleDocumentErrorInfo,
  GenerateSampleDocumentErrorKind,
  GenerateSampleDocumentRequest,
  GenerateSampleDocumentResponse,
} from '../../types/sampleDocument';

/**
 * Erro tipado de "gerar documento de exemplo" (mesmo padrão de `ParseRequestError` em
 * `services/api.ts`): carrega a causa classificada (issue #239) em vez de achatar tudo em
 * `new Error(string)`.
 */
export class GenerateSampleDocumentError extends Error implements GenerateSampleDocumentErrorInfo {
  readonly kind: GenerateSampleDocumentErrorKind;
  readonly httpStatus?: number;

  constructor(info: GenerateSampleDocumentErrorInfo) {
    super(info.message);
    this.name = 'GenerateSampleDocumentError';
    this.kind = info.kind;
    this.httpStatus = info.httpStatus;
  }
}

/**
 * Sentinela reservada só para testes/QA acionarem, de propósito, o caminho de erro 404 do
 * mock (layout sem mapper vinculado) sem depender de um GUID real. Nunca deve aparecer como
 * `layoutGuid` legítimo vindo do catálogo.
 */
const MOCK_NO_MAPPER_LAYOUT_GUID = 'mock-layout-sem-mapper';

/** Gera um valor de campo determinístico a partir de `seed` — sem dependência externa. */
const pseudoRandomDigits = (seed: number, length: number): string => {
  let value = seed || 1;
  let digits = '';
  for (let i = 0; i < length; i += 1) {
    value = (value * 9301 + 49297) % 233280;
    digits += Math.floor((value / 233280) * 10).toString();
  }
  return digits;
};

/**
 * MOCK de POST /api/layouts/{layoutGuid}/generate-sample (LayoutParserApi#355/#356 ainda não
 * implantado). Gera um TXT posicional sintético — hoje só o pathway TextPositional chega até
 * aqui, já que a UI trata layouts Xml como "ainda não disponível" antes de chamar o serviço
 * (issue #240) — respeitando o contrato real de resposta (`generatedDocument`/`format`/
 * `warnings`) e simulando os dois erros de negócio (400/404) descritos na spec.
 *
 * ───────────────────────────────────────────────────────────────────────────────────────
 * PONTO DE TROCA (issue #241): quando a API subir, substituir o corpo desta função por uma
 * chamada real via `apiClient`, mantendo a assinatura:
 *
 *   const response = await apiClient.post<GenerateSampleDocumentResponse>(
 *     `/api/layouts/${encodeURIComponent(layoutGuid)}/generate-sample`,
 *     request
 *   );
 *   return response.data;
 *
 * com o `catch` convertendo 400 → 'unknown_layout' e 404 → 'no_mapper' em
 * `GenerateSampleDocumentError`, no mesmo padrão de `convertParseRequestError`.
 * ───────────────────────────────────────────────────────────────────────────────────────
 */
const generateSampleDocumentMock = async (
  layoutGuid: string,
  request: GenerateSampleDocumentRequest
): Promise<GenerateSampleDocumentResponse> => {
  // Latência artificial pequena para o estado de loading da UI ser observável/testável.
  await new Promise(resolve => setTimeout(resolve, 150));

  if (!layoutGuid || !layoutGuid.trim()) {
    throw new GenerateSampleDocumentError({
      kind: 'unknown_layout',
      message:
        'Layout desconhecido. Selecione um layout válido do catálogo antes de gerar o exemplo.',
      httpStatus: 400,
    });
  }

  if (layoutGuid === MOCK_NO_MAPPER_LAYOUT_GUID) {
    throw new GenerateSampleDocumentError({
      kind: 'no_mapper',
      message: 'Este layout ainda não tem um mapeador TCL/XSL/XSLT — gere um mapeamento primeiro.',
      httpStatus: 404,
    });
  }

  const numberOfRecords =
    request.numberOfRecords && request.numberOfRecords > 0 ? request.numberOfRecords : 1;
  const seed = request.seed ?? Date.now() % 100000;

  const lines = Array.from({ length: numberOfRecords }, (_, index) => {
    const sequence = pseudoRandomDigits(seed + index, 6);
    return `HDR${sequence}EXEMPLOMOCK${String(index + 1).padStart(4, '0')}`;
  });

  return {
    generatedDocument: lines.join('\n'),
    format: 'positional',
    warnings: [
      'Documento gerado por um mock local (LayoutParserApi#355/#356 ainda não está em produção) — não representa dado real.',
    ],
  };
};

export const sampleDocumentService = {
  /**
   * Gera um documento de exemplo a partir do layout já cadastrado no catálogo. Ver comentário
   * em `generateSampleDocumentMock` para o ponto único de troca por chamada real.
   */
  async generateSampleDocument(
    layoutGuid: string,
    request: GenerateSampleDocumentRequest = {}
  ): Promise<GenerateSampleDocumentResponse> {
    return generateSampleDocumentMock(layoutGuid, request);
  },
};

export { MOCK_NO_MAPPER_LAYOUT_GUID };
