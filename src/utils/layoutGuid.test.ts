import { describe, expect, it } from 'vitest';
import { isUsableLayoutGuid, resolveLayoutGuid } from './layoutGuid';

describe('layoutGuid', () => {
  it.each([
    undefined,
    null,
    '',
    '   ',
    '00000000-0000-0000-0000-000000000000',
    'LAY_{00000000-0000-0000-0000-000000000000}',
  ])('rejeita identificador vazio ou zerado: %s', value => {
    expect(isUsableLayoutGuid(value)).toBe(false);
  });

  it.each([
    'aa423936-33b2-4aaf-b7d7-3868be141107',
    'LAY_aa423936-33b2-4aaf-b7d7-3868be141107',
    '{aa423936-33b2-4aaf-b7d7-3868be141107}',
  ])('aceita identificador real em formatos suportados: %s', value => {
    expect(isUsableLayoutGuid(value)).toBe(true);
  });

  it('prioriza o GUID autoritativo devolvido pelo parse', () => {
    expect(resolveLayoutGuid('LAY_parse-guid-1', 'catalog-guid-2')).toBe('LAY_parse-guid-1');
  });

  it('usa o catálogo somente quando o parse não tem GUID utilizável', () => {
    expect(resolveLayoutGuid('00000000-0000-0000-0000-000000000000', 'catalog-guid-2')).toBe(
      'catalog-guid-2'
    );
  });

  it('não inventa GUID quando nenhuma fonte é utilizável', () => {
    expect(resolveLayoutGuid(null, '00000000-0000-0000-0000-000000000000')).toBeUndefined();
  });
});
