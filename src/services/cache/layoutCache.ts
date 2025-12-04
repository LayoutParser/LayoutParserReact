import type { Layout } from '../../types/layout';

const CACHE_KEY = 'layoutParser_layouts';
const CACHE_TIMESTAMP_KEY = 'layoutParser_layouts_timestamp';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora em milissegundos

interface CachedLayouts {
  layouts: Layout[];
  timestamp: number;
}

/**
 * Salva layouts no cache do navegador (localStorage)
 */
export const saveLayoutsToCache = (layouts: Layout[]): void => {
  try {
    const cacheData: CachedLayouts = {
      layouts,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    console.log('✅ Layouts salvos no cache do navegador:', layouts.length);
  } catch (error) {
    console.warn('⚠️ Erro ao salvar layouts no cache:', error);
    // Se o localStorage estiver cheio, tentar limpar e salvar novamente
    if (error instanceof DOMException && error.code === 22) {
      try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ layouts, timestamp: Date.now() }));
        console.log('✅ Cache limpo e layouts salvos novamente');
      } catch (retryError) {
        console.error('❌ Erro ao salvar layouts após limpar cache:', retryError);
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

    const parsed: CachedLayouts = JSON.parse(cachedData);
    const now = Date.now();
    const age = now - parsed.timestamp;

    // Verificar se o cache expirou
    if (age > CACHE_DURATION_MS) {
      console.log('⚠️ Cache expirado, removendo...');
      clearLayoutsCache();
      return null;
    }

    console.log(`✅ Layouts carregados do cache do navegador (${Math.round(age / 1000)}s atrás):`, parsed.layouts.length);
    return parsed.layouts;
  } catch (error) {
    console.warn('⚠️ Erro ao carregar layouts do cache:', error);
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
    console.log('✅ Cache de layouts limpo');
  } catch (error) {
    console.warn('⚠️ Erro ao limpar cache:', error);
  }
};

/**
 * Verifica se há layouts em cache válidos
 */
export const hasValidCache = (): boolean => {
  return loadLayoutsFromCache() !== null;
};

