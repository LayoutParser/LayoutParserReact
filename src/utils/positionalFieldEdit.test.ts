import { describe, expect, it } from 'vitest';

import type { Field } from '../types/field';
import {
  applyPositionalFieldEdit,
  inspectPositionalField,
  POSITIONAL_LINE_LENGTH,
  resolvePositionalLineIndex,
} from './positionalFieldEdit';

const field: Field = {
  lineName: 'LINHA001',
  fieldName: 'CNPJ',
  value: '12345678901234',
  startPosition: 10,
  length: 14,
  occurrence: 1,
};

const content = `${'H'.repeat(POSITIONAL_LINE_LENGTH)}${'0'.repeat(9)}${field.value}${' '.repeat(
  POSITIONAL_LINE_LENGTH - 23
)}`;

describe('positionalFieldEdit', () => {
  it('substitui somente o intervalo exato sem alterar o tamanho ou campos vizinhos', () => {
    const result = applyPositionalFieldEdit(
      content,
      { field, fieldIndex: 0, lineIndex: 1 },
      '98765432109876'
    );

    expect(result.content).toHaveLength(content.length);
    expect(result.content.slice(0, result.startOffset)).toBe(content.slice(0, result.startOffset));
    expect(result.content.slice(result.startOffset, result.endOffset)).toBe('98765432109876');
    expect(result.content.slice(result.endOffset)).toBe(content.slice(result.endOffset));
    expect(result.field.value).toBe('98765432109876');
  });

  it('recusa valor menor, maior ou com caractere de controle', () => {
    const target = { field, fieldIndex: 0, lineIndex: 1 };

    expect(() => applyPositionalFieldEdit(content, target, '123')).toThrow('exatamente 14');
    expect(() => applyPositionalFieldEdit(content, target, '1'.repeat(15))).toThrow(
      'exatamente 14'
    );
    expect(() => applyPositionalFieldEdit(content, target, '1234567890123\n')).toThrow(
      'caracteres de controle'
    );
  });

  it('falha fechado quando posição, comprimento ou conteúdo atual não são comprováveis', () => {
    expect(
      inspectPositionalField(content, {
        field: { ...field, startPosition: undefined },
        fieldIndex: 0,
        lineIndex: 1,
      })
    ).toMatchObject({ editable: false });
    expect(
      inspectPositionalField(content, {
        field: { ...field, length: 700 },
        fieldIndex: 0,
        lineIndex: 1,
      })
    ).toMatchObject({ editable: false });
    expect(
      inspectPositionalField(content.replace(field.value, '0'.repeat(14)), {
        field,
        fieldIndex: 0,
        lineIndex: 1,
      })
    ).toMatchObject({ editable: false, reason: expect.stringContaining('Reprocesse') });
  });

  it('resolve a linha por sequencial único e recusa sequencial ambíguo', () => {
    const first = `000001${' '.repeat(POSITIONAL_LINE_LENGTH - 6)}`;
    const second = `000002${' '.repeat(POSITIONAL_LINE_LENGTH - 6)}`;

    expect(resolvePositionalLineIndex(first + second, '000002', 1, 0, 2)).toBe(1);
    expect(resolvePositionalLineIndex(first + first, '000001', 1, 0, 2)).toBe(-1);
  });

  it('resolve a ocorrência exata pelo código de linha de três posições', () => {
    const first = `000001001${' '.repeat(POSITIONAL_LINE_LENGTH - 9)}`;
    const second = `000002001${' '.repeat(POSITIONAL_LINE_LENGTH - 9)}`;

    expect(resolvePositionalLineIndex(first + second, '001', 1, 0, 2)).toBe(0);
    expect(resolvePositionalLineIndex(first + second, '001', 2, 0, 2)).toBe(1);
    expect(resolvePositionalLineIndex(first + second, '001', 3, 0, 2)).toBe(-1);
  });

  describe('segmentos SAP IDoc (lineSequence não numérico, identificado por nome)', () => {
    // Segmentos IDoc não carregam sequencial de 6/3 dígitos: `lineSequence` chega com o nome
    // do segmento (ex.: "EDI_DC40", "ZRSDM_NFE_400_EMIT"). A única evidência confiável é a
    // ordem física em que o grupo aparece no TXT, que o chamador já calcula (fallbackIndex).

    it('resolve um segmento único pela ordem física do grupo', () => {
      const lines = Array.from({ length: 3 }, () => ' '.repeat(POSITIONAL_LINE_LENGTH)).join('');

      expect(resolvePositionalLineIndex(lines, 'EDI_DC40', 1, 0, 3)).toBe(0);
    });

    it('resolve segmento repetido (múltiplas ocorrências do mesmo nome) por índice distinto', () => {
      const lines = Array.from({ length: 4 }, () => ' '.repeat(POSITIONAL_LINE_LENGTH)).join('');

      // Duas ocorrências de ZRSDM_NFE_400_ITEM em índices físicos diferentes (1 e 3), cada
      // uma resolvida pelo fallbackIndex já calculado pelo chamador para aquele grupo.
      expect(resolvePositionalLineIndex(lines, 'ZRSDM_NFE_400_ITEM', 1, 1, 4)).toBe(1);
      expect(resolvePositionalLineIndex(lines, 'ZRSDM_NFE_400_ITEM', 2, 3, 4)).toBe(3);
    });

    it('resolve campo dentro de segmento aninhado (ex.: ENDEREMIT dentro de EMIT)', () => {
      const lines = Array.from({ length: 5 }, () => ' '.repeat(POSITIONAL_LINE_LENGTH)).join('');

      expect(resolvePositionalLineIndex(lines, 'ZRSDM_NFE_400_ENDEREMIT', 1, 2, 5)).toBe(2);
    });

    it('recusa índice fora dos limites físicos do conteúdo atual', () => {
      const lines = Array.from({ length: 2 }, () => ' '.repeat(POSITIONAL_LINE_LENGTH)).join('');

      expect(resolvePositionalLineIndex(lines, 'EDI_DC40', 1, 2, 3)).toBe(-1);
    });

    it('recusa quando o chamador não reporta nenhum grupo', () => {
      const lines = ' '.repeat(POSITIONAL_LINE_LENGTH);

      expect(resolvePositionalLineIndex(lines, 'EDI_DC40', 1, 0, 0)).toBe(-1);
    });
  });
});
