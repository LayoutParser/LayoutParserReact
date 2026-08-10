import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../api';
import { sessionService } from './sessionService';

vi.mock('../api', () => ({
  default: { get: vi.fn() },
}));

describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna a sessão fornecida pelo gateway', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        authenticated: true,
        user: { name: 'DOMINIO\\usuario' },
        roles: ['admin'],
        isAdmin: true,
      },
    });

    await expect(sessionService.getSession()).resolves.toMatchObject({
      authenticated: true,
      isAdmin: true,
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/session');
  });

  it.each([401, 403])('normaliza HTTP %s como sessão anônima', async status => {
    vi.mocked(apiClient.get).mockRejectedValue({
      isAxiosError: true,
      response: { status },
    });

    await expect(sessionService.getSession()).resolves.toEqual({
      authenticated: false,
      roles: [],
      isAdmin: false,
    });
  });

  it('propaga falhas de infraestrutura', async () => {
    const failure = new Error('gateway indisponível');
    vi.mocked(apiClient.get).mockRejectedValue(failure);

    await expect(sessionService.getSession()).rejects.toBe(failure);
  });
});
