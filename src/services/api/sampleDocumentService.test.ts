import { describe, expect, it } from 'vitest';
import {
  GenerateSampleDocumentError,
  MOCK_NO_MAPPER_LAYOUT_GUID,
  sampleDocumentService,
} from './sampleDocumentService';

describe('sampleDocumentService (mock — LayoutParserApi#355/#356 ainda não implantado)', () => {
  it('gera um documento posicional sintético respeitando o contrato de resposta', async () => {
    const response = await sampleDocumentService.generateSampleDocument('LAY_guid-123', {
      numberOfRecords: 2,
      seed: 42,
    });

    expect(response.format).toBe('positional');
    expect(response.generatedDocument.split('\n')).toHaveLength(2);
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it('rejeita com kind unknown_layout (400) quando o layoutGuid está vazio', async () => {
    await expect(sampleDocumentService.generateSampleDocument('')).rejects.toMatchObject({
      kind: 'unknown_layout',
      httpStatus: 400,
    });
  });

  it('rejeita com kind no_mapper (404) para o sentinela de layout sem mapeador', async () => {
    const error = await sampleDocumentService
      .generateSampleDocument(MOCK_NO_MAPPER_LAYOUT_GUID)
      .catch(e => e);

    expect(error).toBeInstanceOf(GenerateSampleDocumentError);
    expect(error).toMatchObject({ kind: 'no_mapper', httpStatus: 404 });
    expect(error.message).toContain('TCL/XSL/XSLT');
  });

  it('usa 1 registro por padrão quando numberOfRecords não é informado', async () => {
    const response = await sampleDocumentService.generateSampleDocument('LAY_guid-123');
    expect(response.generatedDocument.split('\n')).toHaveLength(1);
  });
});
