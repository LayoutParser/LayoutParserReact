import type { Field } from '../types/field';

const encodePart = (value: string | number | undefined): string =>
  encodeURIComponent(value === undefined ? '' : String(value));

/**
 * Identidade física de um campo no documento. O valor textual nunca participa da chave:
 * editar o campo não pode transformá-lo em outra ocorrência.
 */
export const getFieldPhysicalId = (field: Field): string => {
  const occurrence = field.occurrence ?? 1;
  const position = field.startPosition ?? field.sequence ?? 0;
  const length = field.length ?? 0;

  if (field.lineGuid && field.fieldGuid) {
    return ['field-guid', field.lineGuid, occurrence, field.fieldGuid, position, length]
      .map(encodePart)
      .join(':');
  }

  return [
    'field-fallback',
    field.lineName,
    field.lineSequence ?? '',
    occurrence,
    field.fieldName,
    position,
    length,
  ]
    .map(encodePart)
    .join(':');
};

export const isSamePhysicalField = (left: Field, right: Field): boolean =>
  getFieldPhysicalId(left) === getFieldPhysicalId(right);
