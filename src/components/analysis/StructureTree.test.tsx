import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useStructureStore } from '../../store/useStructureStore';
import type { Field } from '../../types/field';
import StructureTree from './StructureTree';

const fields: Field[] = [
  { lineName: 'HEADER', fieldName: 'Tipo', value: '001', sequence: 1 },
  { lineName: 'HEADER', fieldName: 'Data', value: '20260810', sequence: 2 },
];

describe('StructureTree', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useStructureStore.setState({
      treeData: [],
      expandedNodes: new Set<string>(),
      selectedNodeId: null,
    });
    useFieldStore.setState({
      fields: [],
      fieldGroups: [],
      selectedField: null,
      highlightedFields: new Set<string>(),
    });
    useAppStore.getState().setParseResult({ success: true, fields });
    useAppStore.getState().setFields(fields);
  });

  it('expõe árvore semântica e permite expandir e navegar pelo teclado', async () => {
    render(<StructureTree />);

    const tree = await screen.findByRole('tree', { name: 'Estrutura do documento' });
    expect(tree).toBeInTheDocument();

    const lineItem = screen.getByRole('treeitem', { name: /HEADER/i });
    expect(lineItem).toHaveAttribute('aria-expanded', 'false');
    lineItem.focus();
    fireEvent.keyDown(lineItem, { key: 'ArrowRight' });

    await waitFor(() => expect(lineItem).toHaveAttribute('aria-expanded', 'true'));
    const typeItem = screen.getByRole('treeitem', { name: /Tipo/i });
    fireEvent.keyDown(lineItem, { key: 'ArrowDown' });
    expect(typeItem).toHaveFocus();

    fireEvent.keyDown(typeItem, { key: 'End' });
    expect(screen.getByRole('treeitem', { name: /Data/i })).toHaveFocus();
  });

  it('seleciona e alterna a expansão ao ativar a linha', async () => {
    render(<StructureTree />);
    const lineItem = await screen.findByRole('treeitem', { name: /HEADER/i });

    fireEvent.click(lineItem);

    expect(lineItem).toHaveAttribute('aria-selected', 'true');
    expect(lineItem).toHaveAttribute('aria-expanded', 'true');
  });

  it('apresenta layouts SAP como hierarquia expansível de segmentos', async () => {
    const sapFields: Field[] = [
      { lineName: 'LINHA_EMIT', fieldName: 'CNPJ', value: '02990605001174', sequence: 1 },
    ];
    useAppStore.getState().setParseResult({
      success: true,
      fields: sapFields,
      layout: {
        layoutGuid: 'LAY_sap',
        layoutType: 'TextPositional',
        name: 'LAY_MARELLI_TXT_SAP_ENVNFE_4.00_NFe',
        description: 'Layout IDoc SAP NFe',
        limitOfCaracters: 0,
        elements: [
          {
            type: 'LineElementVO',
            elementGuid: 'LIN_control',
            name: 'LINHA000',
            description: '',
            sequence: 1,
            isRequired: true,
            initialValue: 'EDI_DC40',
            elements: [],
          },
          {
            type: 'LineElementVO',
            elementGuid: 'LIN_ide',
            name: 'LINHA_IDE',
            description: '',
            sequence: 2,
            isRequired: false,
            initialValue: 'ZRSDM_NFE_400_IDE000',
            elements: [],
          },
          {
            type: 'LineElementVO',
            elementGuid: 'LIN_emit',
            name: 'LINHA_EMIT',
            description: '',
            sequence: 3,
            isRequired: false,
            initialValue: 'ZRSDM_NFE_400_EMIT000',
            elements: [
              JSON.stringify({
                Type: 'FieldElementVO',
                ElementGuid: 'FLD_cnpj',
                Name: 'CNPJ',
                Sequence: 1,
              }),
              JSON.stringify({
                Type: 'LineElementVO',
                ElementGuid: 'LIN_enderemit',
                Name: 'LINHA_ENDEMIT',
                Sequence: 2,
                InitialValue: 'ZRSDM_NFE_400_ENDEREMIT000',
                Elements: [],
              }),
            ],
          },
        ],
      },
    });
    useAppStore.getState().setFields(sapFields);

    render(<StructureTree />);

    expect(await screen.findByText('Hierarquia de segmentos')).toBeInTheDocument();
    expect(screen.getByText('4 segmentos')).toBeInTheDocument();

    const control = screen.getByRole('treeitem', { name: /EDI_DC40/i });
    expect(control).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(control);

    const emit = await screen.findByRole('treeitem', { name: /ZRSDM_NFE_400_EMIT/i });
    expect(emit).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: /CNPJ/i })).not.toBeInTheDocument();

    fireEvent.click(emit);
    expect(
      await screen.findByRole('treeitem', { name: /ZRSDM_NFE_400_ENDEREMIT/i })
    ).toBeInTheDocument();
    expect(useFieldStore.getState().highlightedFields).toContain('LINHA_EMIT_CNPJ');
  });
});
