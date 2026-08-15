import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionService } from '../services/api/sessionService';
import { useAppStore } from '../store/useAppStore';
import { useSessionStore } from '../store/useSessionStore';
import MainLayout from './MainLayout';

vi.mock('../services/api/sessionService', () => ({
  sessionService: {
    getSession: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('MainLayout — logout', () => {
  const originalAssign = window.location.assign;

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
    useSessionStore.setState({
      status: 'authenticated',
      authenticated: true,
      isAdmin: false,
      user: { name: 'Estudante Teste' },
      loadSession: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: originalAssign },
    });
  });

  it('chama sessionService.logout() via fetch (sem form nativo) e navega para "/" ao concluir', async () => {
    vi.mocked(sessionService.logout).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <MainLayout />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.getByRole('button', { name: 'Saindo...' })).toBeDisabled();

    await waitFor(() => expect(sessionService.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
  });

  it('mesmo se sessionService.logout() falhar (ex.: rede), navega para "/" para revalidar a sessão', async () => {
    vi.mocked(sessionService.logout).mockRejectedValue(new Error('Falha de rede'));

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <MainLayout />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(sessionService.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith('/'));
  });
});

describe('MainLayout — home pública em "/"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().reset();
  });

  it('mostra a home de apresentação (com login) para quem não está autenticado em "/"', () => {
    useSessionStore.setState({
      status: 'unauthenticated',
      authenticated: false,
      isAdmin: false,
      user: undefined,
      loadSession: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <MainLayout />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Entenda a estrutura dos seus documentos antes de transformá-los/i)
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Entrar com Microsoft' })).toBeVisible();
  });

  it('mostra o gate de autenticação (não a home) para rotas protegidas quando não autenticado', () => {
    useSessionStore.setState({
      status: 'unauthenticated',
      authenticated: false,
      isAdmin: false,
      user: undefined,
      loadSession: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <MainLayout />
      </MemoryRouter>
    );

    expect(
      screen.queryByText(/Entenda a estrutura dos seus documentos antes de transformá-los/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar com Microsoft' })).toBeVisible();
  });
});
