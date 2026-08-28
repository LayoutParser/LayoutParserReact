import type { LineValidationInfo, ParseResponse } from '../types/api';
import type { Field } from '../types/field';
import type { LayoutElement } from '../types/structure';

type UnknownRecord = Record<string, unknown>;

interface FieldDefinition {
  fieldGuid?: string;
  lineGuid?: string;
  length?: number;
}

type ParsedFieldWire = Field & {
  start?: number;
  status?: string;
};

const readRecord = (value: unknown): UnknownRecord | null => {
  if (typeof value === 'string') {
    try {
      return readRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
};

const readString = (record: UnknownRecord, camelCase: string, pascalCase: string): string => {
  const value = record[camelCase] ?? record[pascalCase];
  return typeof value === 'string' ? value : '';
};

const readNumber = (
  record: UnknownRecord,
  camelCase: string,
  pascalCase: string
): number | undefined => {
  const value = record[camelCase] ?? record[pascalCase];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const readChildren = (record: UnknownRecord): unknown[] => {
  const children = record.elements ?? record.Elements;
  if (Array.isArray(children)) return children;
  if (!children || typeof children !== 'object') return [];

  const wrapped = (children as UnknownRecord).Element ?? (children as UnknownRecord).element;
  if (Array.isArray(wrapped)) return wrapped;
  return wrapped === undefined ? [] : [wrapped];
};

const simplifyLineName = (lineName: string): string => {
  const parts = lineName.split('.');
  return parts[parts.length - 1] ?? lineName;
};

const definitionKey = (lineName: string, fieldName: string, sequence?: number): string =>
  `${simplifyLineName(lineName)}\u0000${fieldName}\u0000${sequence ?? ''}`;

const collectFieldDefinitions = (
  elements: LayoutElement[] | undefined
): Map<string, FieldDefinition> => {
  const definitions = new Map<string, FieldDefinition>();

  const visit = (value: unknown, parentLine?: { name: string; guid?: string }) => {
    const record = readRecord(value);
    if (!record) return;

    const type = readString(record, 'type', 'Type').toLowerCase();
    const name = readString(record, 'name', 'Name');
    const guid = readString(record, 'elementGuid', 'ElementGuid') || undefined;
    const isLine = type.includes('lineelement');
    const isField =
      type.includes('fieldelement') ||
      (!isLine && readNumber(record, 'lengthField', 'LengthField') !== undefined);
    const currentLine = isLine && name ? { name: simplifyLineName(name), guid } : parentLine;

    if (isField && currentLine && name) {
      const sequence = readNumber(record, 'sequence', 'Sequence');
      const definition: FieldDefinition = {
        fieldGuid: guid,
        lineGuid: currentLine.guid,
        length: readNumber(record, 'lengthField', 'LengthField'),
      };
      definitions.set(definitionKey(currentLine.name, name, sequence), definition);
      // Compatibilidade com layouts antigos que não serializam Sequence no filho.
      if (sequence === undefined) {
        definitions.set(definitionKey(currentLine.name, name), definition);
      }
    }

    readChildren(record).forEach(child => visit(child, currentLine));
  };

  elements?.forEach(element => visit(element));
  return definitions;
};

const findDefinition = (
  definitions: Map<string, FieldDefinition>,
  field: Field
): FieldDefinition | undefined =>
  definitions.get(definitionKey(field.lineName, field.fieldName, field.sequence)) ??
  definitions.get(definitionKey(field.lineName, field.fieldName));

const findCalculatedPosition = (
  validations: LineValidationInfo[] | undefined,
  field: Field
): number | undefined => {
  const validation = validations?.find(
    item => simplifyLineName(item.lineName) === simplifyLineName(field.lineName)
  );
  const positions = validation?.calculatedPositions;
  if (!positions) return undefined;

  const compoundKey =
    field.sequence === undefined ? undefined : `${field.fieldName}#${field.sequence}`;
  const position = (compoundKey ? positions[compoundKey] : undefined) ?? positions[field.fieldName];
  return Number.isInteger(position) && position > 0 ? position : undefined;
};

const positiveInteger = (...values: Array<number | undefined>): number | undefined =>
  values.find(value => Number.isInteger(value) && (value ?? 0) > 0);

/**
 * Converte o contrato real de `ParsedField` da API para o modelo físico usado pelo front.
 *
 * A API serializa a posição como `start` e o `length` como tamanho do valor já alinhado; para
 * campos vazios esse tamanho é zero. A largura editável vem do `LengthField` do layout, enquanto
 * a posição vem de `start`/`calculatedPositions`. Nenhum valor textual participa da resolução.
 */
export const normalizeParsedFields = (response: ParseResponse): Field[] => {
  const definitions = collectFieldDefinitions(response.layout?.elements);

  return (response.fields ?? [])
    .filter(field => !field.isAggregatedOccurrence && field.occurrence !== 0)
    .map(fieldValue => {
      const field = fieldValue as ParsedFieldWire;
      const definition = findDefinition(definitions, field);
      const startPosition = positiveInteger(
        field.startPosition,
        field.start,
        findCalculatedPosition(response.lineValidations, field)
      );
      const length = positiveInteger(definition?.length, field.length);
      const parsedLength =
        Number.isInteger(field.parsedLength) && (field.parsedLength ?? -1) >= 0
          ? field.parsedLength
          : Number.isInteger(field.length) && (field.length ?? -1) >= 0
            ? field.length
            : undefined;
      const normalizedStatus = field.status?.trim().toLowerCase();

      return {
        ...field,
        startPosition,
        length,
        parsedLength,
        fieldGuid: field.fieldGuid || definition?.fieldGuid,
        lineGuid: field.lineGuid || definition?.lineGuid,
        isValid: field.isValid ?? (normalizedStatus ? normalizedStatus === 'ok' : undefined),
        hasWarning: field.hasWarning ?? (normalizedStatus === 'warning' || undefined),
      };
    });
};

export const normalizeParseResponse = (response: ParseResponse): ParseResponse => ({
  ...response,
  fields: normalizeParsedFields(response),
});
