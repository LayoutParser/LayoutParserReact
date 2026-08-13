import axios from 'axios';
import type { SessionResponse } from '../../types/session';
import apiClient from '../api';

const anonymousSession: SessionResponse = {
  authenticated: false,
  roles: [],
  isAdmin: false,
};

export const sessionService = {
  async getSession(): Promise<SessionResponse> {
    try {
      const response = await apiClient.get<SessionResponse>('/api/session');
      return response.data;
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        return anonymousSession;
      }

      throw error;
    }
  },

  // POST sem body/Content-Type — evita o form HTML nativo (que sempre envia
  // application/x-www-form-urlencoded, tipo que o BFF não registra parser e rejeita com 415).
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
