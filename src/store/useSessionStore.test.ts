import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionService } from '../services/api/sessionService';
import { useSessionStore } from './useSessionStore';

vi.mock('../services/api/sessionService', () => ({
  sessionService: { getSession: vi.fn() },
}));

describe('useSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
  });

  it('carrega identidade administrativa', async () => {
    vi.mocked(sessionService.getSession).mockResolvedValue({
      authenticated: true,
      user: { name: 'usuario' },
      roles: ['admin'],
      isAdmin: true,
    });

    await useSessionStore.getState().loadSession();

    expect(useSessionStore.getState()).toMatchObject({
      status: 'authenticated',
      authenticated: true,
      isAdmin: true,
      error: null,
    });
  });

  it('não repete a consulta depois que a sessão foi resolvida', async () => {
    vi.mocked(sessionService.getSession).mockResolvedValue({
      authenticated: false,
      roles: [],
      isAdmin: false,
    });

    await useSessionStore.getState().loadSession();
    await useSessionStore.getState().loadSession();

    expect(sessionService.getSession).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('unauthenticated');
  });

  it('expõe falha segura quando o gateway não responde', async () => {
    vi.mocked(sessionService.getSession).mockRejectedValue(new Error('offline'));

    await useSessionStore.getState().loadSession();

    expect(useSessionStore.getState()).toMatchObject({
      status: 'error',
      authenticated: false,
      isAdmin: false,
    });
  });
});
