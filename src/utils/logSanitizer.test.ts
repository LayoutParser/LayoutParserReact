import { describe, expect, it } from 'vitest';
import { sanitizeLogContext, sanitizeLogMessage } from './logSanitizer';

describe('logSanitizer', () => {
  it('remove payloads e conteúdo de documentos por nome de chave', () => {
    expect(
      sanitizeLogContext({
        layoutGuid: 'layout-1',
        txtContent: 'segredo',
        transformedXml: '<cliente>segredo</cliente>',
        requestBody: { qualquer: 'valor' },
      })
    ).toEqual({
      layoutGuid: 'layout-1',
      txtContent: '[REDACTED]',
      transformedXml: '[REDACTED]',
      requestBody: '[REDACTED]',
    });
  });

  it('troca arrays potencialmente sensíveis apenas pela contagem', () => {
    expect(sanitizeLogContext({ candidates: ['a', 'b'], status: 422 })).toEqual({
      candidates: { itemCount: 2 },
      status: 422,
    });
  });

  it('remove marcação, quebras de linha e limita mensagens', () => {
    const result = sanitizeLogMessage(`<root>segredo</root>\n${'x'.repeat(300)}`);

    expect(result).not.toContain('<root>');
    expect(result).not.toContain('\n');
    expect(result.length).toBeLessThanOrEqual(241);
  });

  it('não serializa stack ou mensagem de objetos Error', () => {
    expect(sanitizeLogContext({ cause: new Error('documento secreto') })).toEqual({
      cause: { name: 'Error' },
    });
  });
});
