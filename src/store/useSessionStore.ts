import { create } from 'zustand';
import { sessionService } from '../services/api/sessionService';
import type { SessionResponse, SessionStatus } from '../types/session';

interface SessionState extends SessionResponse {
  status: SessionStatus;
  error: string | null;
  loadSession: (force?: boolean) => Promise<void>;
  reset: () => void;
}

const initialSession: Omit<SessionState, 'loadSession' | 'reset'> = {
  authenticated: false,
  roles: [],
  isAdmin: false,
  status: 'idle',
  error: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialSession,

  loadSession: async (force = false) => {
    const currentStatus = get().status;
    if (currentStatus === 'loading' || (!force && currentStatus !== 'idle')) {
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const session = await sessionService.getSession();
      set({
        ...session,
        status: session.authenticated ? 'authenticated' : 'unauthenticated',
        error: null,
      });
    } catch {
      set({
        ...initialSession,
        status: 'error',
        error: 'Não foi possível confirmar sua sessão com o gateway seguro.',
      });
    }
  },

  reset: () => set(initialSession),
}));
