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
});
