import { beforeEach, describe, expect, it } from 'vitest';

import type { Field } from '../types/field';
import { useFieldStore } from './useFieldStore';

const createField = (occurrence: number, lineSequence: string): Field => ({
  lineName: 'LINHA001',
  fieldName: 'CNPJ',
  value: String(occurrence).repeat(14),
  startPosition: 10,
  length: 14,
  sequence: 1,
  occurrence,
  lineSequence,
});

describe('useFieldStore', () => {
  beforeEach(() => useFieldStore.setState({ fields: [], fieldGroups: [] }));

  it('mantém ocorrências físicas da mesma linha em grupos separados', () => {
    useFieldStore.getState().setFields([createField(1, '000001'), createField(2, '000002')]);

    expect(useFieldStore.getState().fieldGroups).toMatchObject([
      { lineName: 'LINHA001', occurrence: 1, lineSequence: '000001' },
      { lineName: 'LINHA001', occurrence: 2, lineSequence: '000002' },
    ]);
  });
});
