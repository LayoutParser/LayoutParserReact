import { describe, expect, it } from 'vitest';

import { buildSapIdocTree, isSapIdocLayout, isSapNfeLayoutName } from './treeBuilder';

const field = {
  Type: 'FieldElementVO',
  ElementGuid: 'FLD_cnpj',
  Name: 'CNPJ',
  Sequence: 1,
};

const sapLayoutElements = [
  {
    type: 'LineElementVO',
    elementGuid: 'LIN_control',
    name: 'LINHA000',
    sequence: 1,
    initialValue: 'EDI_DC40',
    elements: [JSON.stringify(field)],
  },
  {
    type: 'LineElementVO',
    elementGuid: 'LIN_ide',
    name: 'LINHA_IDE',
    sequence: 2,
    initialValue: 'ZRSDM_NFE_400_IDE000',
    elements: [
      JSON.stringify(field),
      JSON.stringify({
        Type: 'LineElementVO',
        ElementGuid: 'LIN_nfref',
        Name: 'LINHA_NFREF',
        Sequence: 2,
        InitialValue: 'ZRSDM_NFE_400_NFREF000',
        Elements: [field],
      }),
    ],
  },
  {
    type: 'LineElementVO',
    elementGuid: 'LIN_emit',
    name: 'LINHA_EMIT',
    sequence: 3,
    initialValue: 'ZRSDM_NFE_400_EMIT000',
    elements: [
      field,
      {
        type: 'LineElementVO',
        elementGuid: 'LIN_enderemit',
        name: 'LINHA_ENDEMIT',
        sequence: 11,
        initialValue: 'ZRSDM_NFE_400_ENDEREMIT000',
        elements: [field],
      },
    ],
  },
  {
    type: 'LineElementVO',
    elementGuid: 'LIN_footer',
    name: 'LINHA_FOOTER',
    sequence: 99,
    initialValue: 'SAPProgramId',
    elements: [],
  },
];

describe('árvore IDoc SAP', () => {
  it('reconhece qualquer cliente da família TXT SAP ENVNFE 4.00', () => {
    expect(isSapNfeLayoutName('LAY_TXT_SAP_ENVNFE_4.00_NFe')).toBe(true);
    expect(isSapNfeLayoutName('LAY_MARELLI_TXT_SAP_ENVNFE_4.00_NFe')).toBe(true);
    expect(isSapNfeLayoutName('LAY_OUTRO_TXT_SAP_ENVNFE_4.00_NFE')).toBe(true);
    expect(isSapNfeLayoutName('LAY_CNHI_TXT_MQSERIES_ENVNFE_4.00_NFe')).toBe(false);
  });

  it('usa EDI_DC40 como raiz e preserva somente a hierarquia de segmentos', () => {
    const [root] = buildSapIdocTree(sapLayoutElements);

    expect(root.name).toBe('EDI_DC40');
    expect(root.level).toBe(0);
    expect(root.sourceLineName).toBe('LINHA000');
    expect(root.children.map(node => node.name)).toEqual([
      'ZRSDM_NFE_400_IDE',
      'ZRSDM_NFE_400_EMIT',
    ]);

    const [ide, emit] = root.children;
    expect(ide.children[0]).toMatchObject({
      name: 'ZRSDM_NFE_400_NFREF',
      level: 2,
      sourceLineName: 'LINHA_NFREF',
    });
    expect(emit.children[0]).toMatchObject({
      name: 'ZRSDM_NFE_400_ENDEREMIT',
      level: 2,
      sourceLineName: 'LINHA_ENDEMIT',
    });
    expect(JSON.stringify(root)).not.toContain('CNPJ');
    expect(JSON.stringify(root)).not.toContain('SAPProgramId');
  });

  it('não fabrica uma raiz quando o layout não contém EDI_DC40', () => {
    expect(buildSapIdocTree(sapLayoutElements.slice(1))).toEqual([]);
  });
});

describe('isSapIdocLayout', () => {
  it('confia no detectedType do back-end mesmo com nome de layout que não bate o sufixo NFe', () => {
    expect(isSapIdocLayout('idoc', 'LAY_QUALQUER_NOME')).toBe(true);
    expect(isSapIdocLayout('IDOC', undefined)).toBe(true);
  });

  it('cai para o nome do layout quando detectedType está ausente (compat com API antiga)', () => {
    expect(isSapIdocLayout(undefined, 'LAY_MARELLI_TXT_SAP_ENVNFE_4.00_NFe')).toBe(true);
  });

  it('não classifica MQSeries como IDoc SAP nem por tipo nem por nome', () => {
    expect(isSapIdocLayout('mqseries', 'LAY_CNHI_TXT_MQSERIES_ENVNFE_4.00_NFe')).toBe(false);
    expect(isSapIdocLayout(undefined, 'LAY_CNHI_TXT_MQSERIES_ENVNFE_4.00_NFe')).toBe(false);
  });
});
