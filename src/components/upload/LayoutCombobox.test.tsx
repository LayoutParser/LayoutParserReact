import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Layout } from '../../types/layout';
import LayoutCombobox from './LayoutCombobox';

const layouts: Layout[] = [
  { layoutGuid: 'guid-nfe-1', name: 'Nota Fiscal' },
  { layoutGuid: 'guid-idoc-2', name: 'IDoc' },
];

describe('LayoutCombobox', () => {
  it('expõe o popup e as opções com semântica de combobox/listbox', () => {
    render(<LayoutCombobox layouts={layouts} selectedLayout={null} onSelect={vi.fn()} />);

    const trigger = screen.getByRole('combobox', { name: 'Selecionar Layout' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('searchbox', { name: 'Buscar layout por nome ou GUID' })).toHaveFocus();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('filtra e seleciona um layout por teclado', async () => {
    const onSelect = vi.fn();
    render(<LayoutCombobox layouts={layouts} selectedLayout={null} onSelect={onSelect} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'idoc' } });
    fireEvent.keyDown(search, { key: 'ArrowDown' });

    const option = screen.getByRole('option', { name: /IDoc/i });
    expect(option).toHaveFocus();
    fireEvent.keyDown(option, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(layouts[1]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('fecha com Escape e devolve o foco ao disparador', async () => {
    render(<LayoutCombobox layouts={layouts} selectedLayout={layouts[0]} onSelect={vi.fn()} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
