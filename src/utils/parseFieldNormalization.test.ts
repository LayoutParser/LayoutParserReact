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

  it('preserva quatro LINHA081 físicas e elimina as duas entradas agregadas', () => {
    const occurrenceFields = [1, 2, 3, 4].flatMap(occurrence => [
      {
        lineName: 'LINHA081',
        fieldName: 'InformacoesParaEDI',
        sequence: 1,
        start: 10,
        length: occurrence === 1 ? 0 : 20,
        value: occurrence === 1 ? '' : `OCORRENCIA ${occurrence}`,
        occurrence,
        occurrenceCount: 4,
        isAggregatedOccurrence: false,
        lineSequence: String(36 + occurrence).padStart(6, '0'),
      },
      {
        lineName: 'LINHA081',
        fieldName: 'Filler',
        sequence: 2,
        start: 510,
        length: 0,
        value: '',
        occurrence,
        occurrenceCount: 4,
        isAggregatedOccurrence: false,
        lineSequence: String(36 + occurrence).padStart(6, '0'),
      },
    ]) as unknown as Field[];
    const aggregateFields = occurrenceFields.slice(0, 2).map(field => ({
      ...field,
      occurrence: 0,
      isAggregatedOccurrence: true,
    }));
    const response = responseWithLayout([...occurrenceFields, ...aggregateFields]);
    response.layout!.elements.push({
      type: 'LineElementVO',
      elementGuid: 'line-guid-081',
      description: 'Informações adicionais repetíveis',
      sequence: 81,
      name: 'LINHA081',
      isRequired: false,
      elements: [
        JSON.stringify({
          Type: 'FieldElementVO',
          ElementGuid: 'field-guid-informacoes',
          Name: 'InformacoesParaEDI',
          Sequence: 1,
          LengthField: 500,
        }),
        JSON.stringify({
          Type: 'FieldElementVO',
          ElementGuid: 'field-guid-filler-081',
          Name: 'Filler',
          Sequence: 2,
          LengthField: 91,
        }),
      ],
    });

    const fields = normalizeParsedFields(response);

    expect(fields).toHaveLength(8);
    expect([...new Set(fields.map(field => field.occurrence))]).toEqual([1, 2, 3, 4]);
    expect(fields.filter(field => field.fieldName === 'InformacoesParaEDI')).toHaveLength(4);
    expect(fields.filter(field => field.fieldName === 'Filler')).toHaveLength(4);
    expect(fields.every(field => (field.length ?? 0) > 0)).toBe(true);
    expect(fields.some(field => field.occurrence === 0 || field.isAggregatedOccurrence)).toBe(
      false
    );
  });
});
