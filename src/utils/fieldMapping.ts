import type { Field } from '../types/field';
import type { FieldMapping, FieldMappingSource, FieldMappingTarget } from '../types/transformation';
import { isSamePhysicalField } from './fieldIdentity';
import type { XmlSelectableNode } from './xmlTree';

const normalizeGuid = (value: string | undefined): string =>
  (value ?? '').replace(/[{}]/g, '').trim().toLowerCase();

const normalizeXpath = (xpath: string): string => {
  const normalized = xpath.trim().replace(/\/+$/g, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const hasStructuralSuffix = (nodeXpath: string, targetXpath: string): boolean => {
  const node = normalizeXpath(nodeXpath);
  const target = normalizeXpath(targetXpath);
  return node === target || node.endsWith(target);
};

export const fieldMatchesMappingSource = (field: Field, source: FieldMappingSource): boolean => {
  const sourceLengths = new Set(
    [field.parsedLength, field.length].filter(
      (length): length is number =>
        typeof length === 'number' && Number.isInteger(length) && length > 0
    )
  );
  if (
    source.lineOccurrence <= 0 ||
    source.startPosition <= 0 ||
    source.length <= 0 ||
    (field.occurrence ?? 1) !== source.lineOccurrence ||
    field.startPosition !== source.startPosition ||
    !sourceLengths.has(source.length)
  ) {
    return false;
  }

  const sourceLineGuid = normalizeGuid(source.lineGuid);
  const sourceFieldGuid = normalizeGuid(source.fieldGuid);
  const fieldLineGuid = normalizeGuid(field.lineGuid);
  const fieldGuid = normalizeGuid(field.fieldGuid);

  if (sourceLineGuid && sourceFieldGuid && fieldLineGuid && fieldGuid) {
    return sourceLineGuid === fieldLineGuid && sourceFieldGuid === fieldGuid;
  }

  return field.lineName === source.lineName && field.fieldName === source.fieldName;
};

export const resolveSourceFields = (fields: Field[], source: FieldMappingSource): Field[] =>
  fields.filter(field => fieldMatchesMappingSource(field, source));

const nodeKindMatchesTarget = (node: XmlSelectableNode, target: FieldMappingTarget): boolean =>
  node.kind === target.nodeKind.toLowerCase();

export const resolveTargetNodes = (
  nodes: XmlSelectableNode[],
  target: FieldMappingTarget
): XmlSelectableNode[] => {
  const structuralMatches = nodes.filter(
    node => nodeKindMatchesTarget(node, target) && hasStructuralSuffix(node.xpath, target.xpath)
  );

  if (target.xmlOccurrence === null) {
    return structuralMatches;
  }

  if (target.xmlOccurrence <= 0) return [];
  return structuralMatches.filter(node => node.xpathOccurrence === target.xmlOccurrence);
};

export const getMappingsForField = (mappings: FieldMapping[], field: Field): FieldMapping[] =>
  mappings.filter(mapping =>
    mapping.sources.some(source =>
      resolveSourceFields([field], source).some(candidate => isSamePhysicalField(candidate, field))
    )
  );

export const getMappingsForXmlNode = (
  mappings: FieldMapping[],
  nodes: XmlSelectableNode[],
  selectedNode: XmlSelectableNode
): FieldMapping[] =>
  mappings.filter(mapping =>
    mapping.targets.some(target =>
      resolveTargetNodes(nodes, target).some(node => node.id === selectedNode.id)
    )
  );
