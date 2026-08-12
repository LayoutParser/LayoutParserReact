import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PositionalFieldTarget } from '../../../utils/positionalFieldEdit';
import FieldEditor from './FieldEditor';

const target: PositionalFieldTarget = {
  fieldIndex: 0,
  lineIndex: 0,
  field: {
    lineName: 'LINHA001',
    fieldName: 'CNPJ',
    value: '12345678901234',
    startPosition: 1,
    length: 14,
  },
};

describe('FieldEditor', () => {
  it('exige o comprimento exato e salva o valor posicional', () => {
    const onSave = vi.fn();
    render(
      <FieldEditor
        content={`${target.field.value}${' '.repeat(586)}`}
        target={target}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    const input = screen.getByLabelText('Novo valor');
    const save = screen.getByRole('button', { name: 'Aplicar no TXT' });
    expect(save).toBeDisabled();

    fireEvent.change(input, { target: { value: '123' } });
    expect(screen.getByText('3/14')).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.change(input, { target: { value: '98765432109876' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(target, '98765432109876');
  });

  it('bloqueia edição quando o intervalo não coincide com o TXT', () => {
    render(
      <FieldEditor
        content={`${'0'.repeat(14)}${' '.repeat(586)}`}
        target={target}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Reprocesse o documento');
    expect(screen.getByRole('button', { name: 'Aplicar no TXT' })).toBeDisabled();
  });
});
