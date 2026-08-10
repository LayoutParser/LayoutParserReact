import type { AuthenticatedIdentity } from '../auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    identity: AuthenticatedIdentity | null;
    payloadLimitKind: 'request' | 'document' | null;
  }
}
