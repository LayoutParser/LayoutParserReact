import axios from 'axios';
import type { ApiConfig, ParseRequest, ParseResponse } from '../types/api';

// Configuração da API
const getApiBaseUrl = (): string => {
  // Usar variável de ambiente se disponível
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  
  const hostname = window.location.hostname;
  
  // Servidor de produção
  if (hostname === '172.25.32.42') {
    return 'http://172.25.32.42:5000';
  }
  
  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Fallback: mesma origem
  return window.location.origin;
};

const API_CONFIG: ApiConfig = {
  baseUrl: getApiBaseUrl(),
  endpoints: {
    parse: '/api/parse/upload',
    layoutDatabase: '/api/layoutdatabase',
    dataGeneration: '/api/datageneration',
    dataGenerator: '/api/datagenerator',
    learning: '/api/learning',
    xmlAnalysis: '/api/xmlanalysis',
    transformationExecution: '/api/transformationexecution',
    testing: '/api/testing',
    metrics: '/api/metrics',
  },
};

// Instância do axios configurada
const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: 120000, // 2 minutos - necessário para buscar layouts do banco
  // Não definir Content-Type para FormData - axios faz isso automaticamente com boundary
});

// Serviço de parsing
export const parseService = {
  /**
   * Envia arquivos para parsing na API
   */
  async parseFiles(request: ParseRequest): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append('layoutFile', request.layoutFile);
    formData.append('txtFile', request.txtFile);
    
    if (request.layoutName) {
      formData.append('layoutName', request.layoutName);
    }
    
    if (request.layoutType) {
      formData.append('layoutType', request.layoutType);
    }
    
    if (request.layoutConfig) {
      formData.append('layoutConfig', JSON.stringify(request.layoutConfig));
    }

    try {
      const response = await apiClient.post<ParseResponse>(
        API_CONFIG.endpoints.parse,
        formData
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || 
          error.message || 
          'Erro ao processar arquivos'
        );
      }
      throw error;
    }
  },
};

// Log da configuração
console.log('🔧 API Config:', API_CONFIG);
console.log('📍 API URL:', API_CONFIG.baseUrl);

export default apiClient;
export { apiClient };

