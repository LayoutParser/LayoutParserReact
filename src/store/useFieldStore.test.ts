import { beforeEach, describe, expect, it } from 'vitest';

import type { Field } from '../types/field';
import { useFieldStore } from './useFieldStore';
import { getFieldPhysicalId } from '../utils/fieldIdentity';

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
  beforeEach(() => useFieldStore.getState().reset());

  it('mantém ocorrências físicas da mesma linha em grupos separados', () => {
    useFieldStore.getState().setFields([createField(1, '000001'), createField(2, '000002')]);

    expect(useFieldStore.getState().fieldGroups).toMatchObject([
      { lineName: 'LINHA001', occurrence: 1, lineSequence: '000001' },
      { lineName: 'LINHA001', occurrence: 2, lineSequence: '000002' },
    ]);
  });

  it('seleciona somente a ocorrência física pedida entre quatro campos homônimos', () => {
    const fields = [1, 2, 3, 4].map(occurrence =>
      createField(occurrence, String(occurrence).padStart(6, '0'))
    );
    useFieldStore.getState().setFields(fields);

    useFieldStore.getState().selectField(fields[2]!);

    const selectedId = getFieldPhysicalId(fields[2]!);
    expect(new Set(fields.map(getFieldPhysicalId))).toHaveProperty('size', 4);
    expect(useFieldStore.getState()).toMatchObject({
      selectedField: fields[2],
      selectedFieldId: selectedId,
    });
    expect(useFieldStore.getState().highlightedFields).toEqual(new Set([selectedId]));
    expect(useFieldStore.getState().getFieldById(selectedId)).toBe(fields[2]);
  });
});
