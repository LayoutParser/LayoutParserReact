export interface SessionUser {
  name: string;
}

export interface SessionResponse {
  authenticated: boolean;
  user?: SessionUser;
  roles: string[];
  isAdmin: boolean;
}

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
