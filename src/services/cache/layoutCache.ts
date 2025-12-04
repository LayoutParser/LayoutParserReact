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
    if (cacheString.length > 4 * 1024 * 1024) { // 4MB
      console.warn('⚠️ Cache muito grande, salvando apenas metadados');
    }
    
    localStorage.setItem(CACHE_KEY, cacheString);
    console.log('✅ Layouts salvos no cache do navegador (metadados apenas):', layouts.length);
  } catch (error) {
    console.warn('⚠️ Erro ao salvar layouts no cache:', error);
    // Se o localStorage estiver cheio, limpar cache antigo e tentar novamente
    if (error instanceof DOMException && (error.code === 22 || error.name === 'QuotaExceededError')) {
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
        console.log('✅ Cache limpo e salvos apenas 50 primeiros layouts (metadados)');
      } catch (retryError) {
        console.error('❌ Erro ao salvar layouts após limpar cache:', retryError);
        // Se ainda falhar, não salvar cache (não é crítico)
        console.warn('⚠️ Cache desabilitado devido a limitações de armazenamento');
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

