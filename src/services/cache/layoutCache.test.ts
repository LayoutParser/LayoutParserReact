import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLayoutsCache,
  hasValidCache,
  loadLayoutsFromCache,
  saveLayoutsToCache,
} from './layoutCache';

describe('layoutCache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persiste somente metadados não sensíveis', () => {
    saveLayoutsToCache([
      {
        layoutGuid: 'layout-1',
        name: 'Layout 1',
        decryptedContent: '<segredo />',
        valueContent: '<outro-segredo />',
      },
    ]);

    const raw = localStorage.getItem('layoutParser_layouts');
    expect(raw).toContain('layout-1');
    expect(raw).not.toContain('segredo');
    expect(loadLayoutsFromCache()).toEqual([
      expect.objectContaining({ layoutGuid: 'layout-1', name: 'Layout 1' }),
    ]);
  });

  it('descarta JSON adulterado ou fora do contrato', () => {
    localStorage.setItem(
      'layoutParser_layouts',
      JSON.stringify({ timestamp: Date.now(), layouts: [{ layoutGuid: 123, name: null }] })
    );

    expect(loadLayoutsFromCache()).toBeNull();
    expect(localStorage.getItem('layoutParser_layouts')).toBeNull();
  });

  it('descarta cache expirado', () => {
    localStorage.setItem(
      'layoutParser_layouts',
      JSON.stringify({
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        layouts: [{ layoutGuid: 'layout-1', name: 'Layout 1' }],
      })
    );

    expect(hasValidCache()).toBe(false);
  });

  it('limpa todas as chaves relacionadas', () => {
    localStorage.setItem('layoutParser_layouts', '{}');
    localStorage.setItem('layoutParser_layouts_timestamp', '123');

    clearLayoutsCache();

    expect(localStorage.length).toBe(0);
  });
});
