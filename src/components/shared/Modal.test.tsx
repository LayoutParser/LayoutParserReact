import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('expõe semântica de diálogo, fecha com Escape e restaura o foco', () => {
    const launcher = document.createElement('button');
    document.body.appendChild(launcher);
    launcher.focus();
    const onClose = vi.fn();

    const { rerender } = render(
      <Modal isOpen onClose={onClose} title="Detalhes do documento">
        <button type="button">Confirmar</button>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Detalhes do documento' });
    const closeButton = screen.getByRole('button', { name: 'Fechar janela' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(closeButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <Modal isOpen={false} onClose={onClose} title="Detalhes do documento">
        <button type="button">Confirmar</button>
      </Modal>
    );
    expect(launcher).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    launcher.remove();
  });

  it('mantém o foco dentro do diálogo ao navegar com Tab', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Ações">
        <button type="button">Confirmar</button>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Fechar janela' });
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });

    confirmButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();
  });

  it('fecha somente quando o clique acontece no backdrop', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <p>Conteúdo</p>
      </Modal>
    );

    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
