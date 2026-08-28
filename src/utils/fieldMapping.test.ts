import { describe, expect, it } from 'vitest';

import type { Field } from '../types/field';
import type { FieldMappingSource, FieldMappingTarget } from '../types/transformation';
import { flattenXmlTree, parseXmlToTree } from './xmlTree';
import { resolveSourceFields, resolveTargetNodes } from './fieldMapping';

const createField = (occurrence: number): Field => ({
  lineGuid: '{LINE-GUID}',
  lineName: 'LINHA081',
  fieldGuid: '{FIELD-GUID}',
  fieldName: 'CNPJ',
  occurrence,
  lineSequence: String(occurrence).padStart(6, '0'),
  startPosition: 42,
  length: 14,
  value: String(occurrence).repeat(14),
});

describe('fieldMapping', () => {
  it('resolve somente a ocorrência física indicada, sem comparar valor', () => {
    const fields = [1, 2, 3, 4].map(createField);
    const source: FieldMappingSource = {
      lineGuid: 'line-guid',
      lineName: 'LINHA081',
      fieldGuid: 'field-guid',
      fieldName: 'CNPJ',
      lineOccurrence: 3,
      startPosition: 42,
      length: 14,
    };

    expect(resolveSourceFields(fields, source)).toEqual([fields[2]]);
  });

  it('resolve XPath namespaced e ocorrência XML 1-based', () => {
    const xml =
      '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe><det nItem="1"/><det nItem="2"/></infNFe></NFe></nfeProc>';
    const { root } = parseXmlToTree(xml, {
      nfe: 'http://www.portalfiscal.inf.br/nfe',
    });
    const nodes = flattenXmlTree(root);
    const target: FieldMappingTarget = {
      xpath: '/nfe:NFe/nfe:infNFe/nfe:det',
      nodeKind: 'Element',
      xmlOccurrence: 2,
    };

    expect(resolveTargetNodes(nodes, target)).toMatchObject([
      { kind: 'element', xpathOccurrence: 2, name: 'det' },
    ]);
  });

  it('distingue atributo de elemento no mesmo XPath estrutural', () => {
    const { root } = parseXmlToTree('<NFe><infNFe Id="NFe1" /></NFe>');
    const nodes = flattenXmlTree(root);
    const target: FieldMappingTarget = {
      xpath: '/NFe/infNFe/@Id',
      nodeKind: 'Attribute',
      xmlOccurrence: null,
    };

    expect(resolveTargetNodes(nodes, target)).toMatchObject([
      { kind: 'attribute', name: 'Id', value: 'NFe1' },
    ]);
  });
});
