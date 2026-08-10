import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../store/useSessionStore';
import RequireAdmin from './RequireAdmin';

describe('RequireAdmin', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  it('mostra estado de carregamento enquanto confirma a sessão', () => {
    const loadSession = vi.fn().mockResolvedValue(undefined);
    useSessionStore.setState({ status: 'loading', loadSession });

    render(
      <MemoryRouter>
        <RequireAdmin>
          <p>segredo administrativo</p>
        </RequireAdmin>
      </MemoryRouter>
    );

    expect(screen.getByText('Confirmando acesso administrativo…')).toBeInTheDocument();
    expect(screen.queryByText('segredo administrativo')).not.toBeInTheDocument();
  });

  it('bloqueia usuário sem função administrativa', () => {
    useSessionStore.setState({
      status: 'authenticated',
      authenticated: true,
      isAdmin: false,
      loadSession: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter>
        <RequireAdmin>
          <p>segredo administrativo</p>
        </RequireAdmin>
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Acesso restrito');
    expect(screen.queryByText('segredo administrativo')).not.toBeInTheDocument();
  });

  it('libera o conteúdo para administrador autenticado', () => {
    useSessionStore.setState({
      status: 'authenticated',
      authenticated: true,
      isAdmin: true,
      loadSession: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter>
        <RequireAdmin>
          <p>conteúdo administrativo</p>
        </RequireAdmin>
      </MemoryRouter>
    );

    expect(screen.getByText('conteúdo administrativo')).toBeInTheDocument();
  });
});
