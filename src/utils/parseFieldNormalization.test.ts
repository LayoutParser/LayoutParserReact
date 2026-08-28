import { describe, expect, it } from 'vitest';
import type { ParseResponse } from '../types/api';
import type { Field } from '../types/field';
import { normalizeParsedFields } from './parseFieldNormalization';

const physicalField = {
  lineName: 'LINHA000',
  fieldName: 'NroProtocoloAutorizacao',
  sequence: 7,
  start: 75,
  length: 0,
  value: '',
  status: 'ok',
  occurrence: 1,
  occurrenceCount: 1,
  isAggregatedOccurrence: false,
  lineSequence: '000001',
} as unknown as Field;

const responseWithLayout = (fields: Field[]): ParseResponse => ({
  success: true,
  fields,
  layout: {
    layoutGuid: 'layout-guid',
    layoutType: '2',
    name: 'LAY_TXT_MQSERIES_ENVNFE_4.00_NFe',
    description: 'Layout de regressão',
    limitOfCaracters: 600,
    elements: [
      {
        type: 'LineElementVO',
        elementGuid: 'line-guid-000',
        description: 'Linha 000',
        sequence: 1,
        name: 'LINHA000',
        isRequired: true,
        elements: [
          JSON.stringify({
            Type: 'FieldElementVO',
            ElementGuid: 'field-guid-protocolo',
            Name: 'NroProtocoloAutorizacao',
            Sequence: 7,
            LengthField: 15,
          }),
        ],
      },
    ],
  },
  lineValidations: [
    {
      lineName: 'LINHA000',
      initialValue: '000',
      initialValueLength: 3,
      sequenceFromPreviousLine: 6,
      fieldsLength: 591,
      sequenciaLength: 6,
      totalLength: 600,
      isValid: true,
      hasChildren: true,
      fieldCount: 1,
      calculatedPositions: { NroProtocoloAutorizacao: 75 },
    },
  ],
});

describe('normalizeParsedFields', () => {
  it('usa Start físico e LengthField declarado para tornar um campo vazio editável', () => {
    const [field] = normalizeParsedFields(responseWithLayout([physicalField]));

    expect(field).toMatchObject({
      startPosition: 75,
      length: 15,
      parsedLength: 0,
      lineGuid: 'line-guid-000',
      fieldGuid: 'field-guid-protocolo',
      isValid: true,
    });
  });

  it('usa calculatedPositions quando versões antigas da API não enviam Start', () => {
    const fieldWithoutStart = { ...physicalField } as Field & { start?: number };
    delete fieldWithoutStart.start;

    expect(normalizeParsedFields(responseWithLayout([fieldWithoutStart]))[0]?.startPosition).toBe(
      75
    );
  });

  it('remove a ocorrência lógica agregada da lista de linhas físicas', () => {
    const aggregated = {
      ...physicalField,
      occurrence: 0,
      occurrenceCount: 4,
      isAggregatedOccurrence: true,
      value: 'SolicitantePISCOFINS',
      length: 22,
    } as Field;

    const fields = normalizeParsedFields(responseWithLayout([physicalField, aggregated]));

    expect(fields).toHaveLength(1);
    expect(fields[0]?.occurrence).toBe(1);
    expect(fields.some(field => field.isAggregatedOccurrence)).toBe(false);
  });
});
