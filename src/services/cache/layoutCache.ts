import type { Layout } from '../../types/layout';

const CACHE_KEY = 'layoutParser_layouts';
const CACHE_TIMESTAMP_KEY = 'layoutParser_layouts_timestamp';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora em milissegundos

interface CachedLayouts {
  layouts: Layout[];
  timestamp: number;
}

const isCachedLayout = (value: unknown): value is Layout => {
  if (typeof value !== 'object' || value === null) return false;
  const layout = value as Record<string, unknown>;
  return typeof layout.layoutGuid === 'string' && typeof layout.name === 'string';
};

const isCachedLayouts = (value: unknown): value is CachedLayouts => {
  if (typeof value !== 'object' || value === null) return false;
  const cache = value as Record<string, unknown>;
  return (
    typeof cache.timestamp === 'number' &&
    Number.isFinite(cache.timestamp) &&
    Array.isArray(cache.layouts) &&
    cache.layouts.every(isCachedLayout)
  );
};

/**
 * Salva layouts no cache do navegador (localStorage)
 * Remove decryptedContent para economizar espaço (pode ser muito grande)
 */
export const saveLayoutsToCache = (layouts: Layout[]): void => {
  try {
    // Criar versão leve dos layouts (sem decryptedContent para economizar espaço)
    const lightweightLayouts = layouts.map(layout => ({
      layoutGuid: layout.layoutGuid,
      name: layout.name,
      description: layout.description,
      version: layout.version,
      layoutType: layout.layoutType,
      // Não salvar decryptedContent - será buscado do backend quando necessário
    }));

    const cacheData: CachedLayouts = {
      layouts: lightweightLayouts as Layout[],
      timestamp: Date.now(),
    };

    const cacheString = JSON.stringify(cacheData);

    // Verificar tamanho antes de salvar (localStorage geralmente tem limite de 5-10MB)
    if (cacheString.length > 4 * 1024 * 1024) {
      // 4MB
      if (import.meta.env.DEV) {
        console.warn('⚠️ Cache de layouts acima do tamanho recomendado.');
      }
    }

    localStorage.setItem(CACHE_KEY, cacheString);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Não foi possível salvar o cache de layouts.');
    }
    // Se o localStorage estiver cheio, limpar cache antigo e tentar novamente
    if (
      error instanceof DOMException &&
      (error.code === 22 || error.name === 'QuotaExceededError')
    ) {
      try {
        // Limpar todo o cache relacionado
        clearLayoutsCache();

        // Tentar salvar apenas os primeiros 50 layouts para não exceder o limite
        const limitedLayouts = layouts.slice(0, 50).map(layout => ({
          layoutGuid: layout.layoutGuid,
          name: layout.name,
          description: layout.description,
          version: layout.version,
          layoutType: layout.layoutType,
        }));

        const limitedCache = {
          layouts: limitedLayouts as Layout[],
          timestamp: Date.now(),
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(limitedCache));
      } catch {
        // Se ainda falhar, não salvar cache (não é crítico)
        if (import.meta.env.DEV) {
          console.warn('⚠️ Cache desabilitado devido a limitações de armazenamento.');
        }
      }
    }
  }
};

/**
 * Carrega layouts do cache do navegador
 * Retorna null se o cache não existir ou estiver expirado
 */
export const loadLayoutsFromCache = (): Layout[] | null => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) {
      return null;
    }

    const parsed: unknown = JSON.parse(cachedData);
    if (!isCachedLayouts(parsed)) {
      clearLayoutsCache();
      return null;
    }
    const now = Date.now();
    const age = now - parsed.timestamp;

    // Verificar se o cache expirou
    if (age > CACHE_DURATION_MS) {
      clearLayoutsCache();
      return null;
    }

    return parsed.layouts;
  } catch {
    if (import.meta.env.DEV) {
      console.warn('⚠️ O cache de layouts era inválido e foi limpo.');
    }
    clearLayoutsCache();
    return null;
  }
};

/**
 * Limpa o cache de layouts
 */
export const clearLayoutsCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Não foi possível limpar o cache de layouts.');
    }
  }
};

/**
 * Verifica se há layouts em cache válidos
 */
export const hasValidCache = (): boolean => {
  return loadLayoutsFromCache() !== null;
};
