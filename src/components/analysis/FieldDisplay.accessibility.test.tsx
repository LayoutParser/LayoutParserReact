import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '../../store/useAppStore';
import { useFieldStore } from '../../store/useFieldStore';
import { useSearchStore } from '../../store/useSearchStore';
import { useTraceabilityStore } from '../../store/useTraceabilityStore';
import { useTransformationStore } from '../../store/useTransformationStore';
import type { Field } from '../../types/field';
import FieldDisplay from './FieldDisplay';

const createField = (occurrence: number): Field => ({
  lineName: 'LINHA081',
  fieldName: 'CNPJ',
  value: String(occurrence).repeat(14),
  startPosition: 10,
  length: 14,
  lineSequence: String(occurrence).padStart(6, '0'),
  occurrence,
});

describe('FieldDisplay — ocorrência e teclado', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useFieldStore.getState().reset();
    useSearchStore.getState().clearSearch();
    useTraceabilityStore.getState().reset();
    useTransformationStore.getState().reset();
  });

  it('mantém uma única entrada de Tab e seleciona a terceira ocorrência sem abrir edição', () => {
    const fields = [1, 2, 3, 4].map(createField);
    useAppStore.setState({
      fields,
      parseResult: { success: true, fields },
      txtContent: fields.map(field => field.value.padEnd(600, ' ')).join(''),
    });

    render(<FieldDisplay />);
    const fieldButtons = screen.getAllByRole('button', { name: /Selecionar campo CNPJ/ });

    expect(fieldButtons).toHaveLength(4);
    expect(fieldButtons.filter(button => button.tabIndex === 0)).toHaveLength(1);
    fireEvent.click(fieldButtons[2]!);
    expect(useFieldStore.getState().selectedField?.occurrence).toBe(3);
    expect(useTraceabilityStore.getState().inspectorOpen).toBe(true);
    expect(screen.queryByRole('dialog', { name: /Editar CNPJ/ })).not.toBeInTheDocument();

    fireEvent.keyDown(fieldButtons[2]!, { key: 'End', ctrlKey: true });
    expect(fieldButtons[3]).toHaveFocus();
    expect(fieldButtons.filter(button => button.tabIndex === 0)).toHaveLength(1);
  });
});
