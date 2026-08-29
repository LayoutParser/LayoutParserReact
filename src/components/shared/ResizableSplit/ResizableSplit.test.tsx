import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResizableSplit from './ResizableSplit';

const renderSplit = () =>
  render(
    <ResizableSplit
      direction="rows"
      primary={<div>TXT</div>}
      primaryLabel="TXT posicional"
      secondary={<div>Estrutura</div>}
      secondaryLabel="Estrutura do documento"
      handleLabel="Redimensionar TXT e estrutura"
      handleText="TXT / estrutura"
      storageKey="test-row"
      defaultSize={62}
      minSize={42}
      maxSize={72}
    />
  );

describe('ResizableSplit', () => {
  beforeEach(() => localStorage.clear());

  it('permite escolher o tamanho pelo teclado e persiste a preferência', () => {
    const firstRender = renderSplit();
    const separator = screen.getByRole('separator', {
      name: 'Redimensionar TXT e estrutura',
    });

    expect(separator).toHaveAttribute('aria-valuenow', '62');
    fireEvent.keyDown(separator, { key: 'ArrowDown' });
    expect(separator).toHaveAttribute('aria-valuenow', '67');
    expect(localStorage.getItem('layoutParser.panelSize.test-row')).toBe('67');

    firstRender.unmount();
    renderSplit();
    expect(
      screen.getByRole('separator', { name: 'Redimensionar TXT e estrutura' })
    ).toHaveAttribute('aria-valuenow', '67');
  });

  it('aceita arraste, respeita limites e restaura o tamanho padrão', () => {
    renderSplit();
    const separator = screen.getByRole('separator', {
      name: 'Redimensionar TXT e estrutura',
    });
    const root = separator.parentElement;
    if (!root) throw new Error('Raiz do divisor não encontrada.');

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 1000,
      width: 800,
      height: 1000,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(separator, { pointerId: 1, clientY: 620 });
    fireEvent.pointerMove(separator, { pointerId: 1, clientY: 900 });
    expect(separator).toHaveAttribute('aria-valuenow', '72');
    fireEvent.pointerUp(separator, { pointerId: 1, clientY: 900 });

    fireEvent.doubleClick(separator);
    expect(separator).toHaveAttribute('aria-valuenow', '62');
  });
});
