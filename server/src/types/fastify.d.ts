import type { AuthenticatedIdentity, SessionIdentity } from '../auth.js';
import type { OidcTransaction } from '../oidc.js';

declare module '@fastify/secure-session' {
  interface SessionData {
    identity: SessionIdentity;
    oidcTransaction: OidcTransaction;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    identity: AuthenticatedIdentity | null;
    payloadLimitKind: 'request' | 'document' | null;
  }
}
