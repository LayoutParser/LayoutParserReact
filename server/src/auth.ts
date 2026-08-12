import type {
  FastifyReply,
  FastifyRequest,
  RawServerBase,
  RequestGenericInterface,
  RouteGenericInterface,
} from 'fastify';

import type { AppConfig } from './config.js';

export interface AuthenticatedIdentity {
  readonly name: string;
  readonly roles: readonly string[];
  readonly isAdmin: boolean;
}

export interface SessionIdentity {
  readonly name: string;
  readonly roles: readonly string[];
  readonly subject: string;
  readonly tenantId: string;
}

type AnyFastifyRequest = FastifyRequest<RequestGenericInterface, RawServerBase>;
type AnyFastifyReply = FastifyReply<RouteGenericInterface, RawServerBase>;

function isSafeIdentityValue(value: string): boolean {
  if (value.length === 0 || value.length > 256) {
    return false;
  }

  return [...value].every(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint > 31 && codePoint !== 127;
  });
}

function readSafeHeader(request: AnyFastifyRequest, name: string): string | null {
  const rawValue = request.headers[name];
  if (rawValue === undefined || Array.isArray(rawValue)) {
    return null;
  }

  const value = rawValue.trim();
  return isSafeIdentityValue(value) ? value : null;
}

function parseRoles(value: string | null): readonly string[] {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(/[;,]/)
        .map(role => role.trim())
        .filter(Boolean)
    ),
  ].slice(0, 50);
}

function calculateIsAdmin(name: string, roles: readonly string[], config: AppConfig): boolean {
  if (config.adminUsers.has(name.toLocaleLowerCase('en-US'))) {
    return true;
  }

  return roles.some(role => config.adminRoles.has(role.toLocaleLowerCase('en-US')));
}

export function resolveIdentity(
  request: AnyFastifyRequest,
  config: AppConfig
): AuthenticatedIdentity | null {
  const sessionIdentity = request.session.get('identity');
  if (
    sessionIdentity &&
    typeof sessionIdentity.name === 'string' &&
    typeof sessionIdentity.subject === 'string' &&
    typeof sessionIdentity.tenantId === 'string' &&
    Array.isArray(sessionIdentity.roles) &&
    isSafeIdentityValue(sessionIdentity.name) &&
    isSafeIdentityValue(sessionIdentity.subject) &&
    isSafeIdentityValue(sessionIdentity.tenantId)
  ) {
    const roles = sessionIdentity.roles
      .filter((role): role is string => typeof role === 'string' && isSafeIdentityValue(role))
      .slice(0, 50);
    return {
      name: sessionIdentity.name,
      roles,
      isAdmin: calculateIsAdmin(sessionIdentity.name, roles, config),
    };
  }

  if (config.isProduction || !config.developmentAuthEnabled) {
    return null;
  }

  const name = readSafeHeader(request, config.developmentUserHeader);
  if (!name) {
    return null;
  }

  const roles = parseRoles(readSafeHeader(request, config.developmentRolesHeader));
  return {
    name,
    roles,
    isAdmin: calculateIsAdmin(name, roles, config),
  };
}

export function canonicalizePath(rawUrl: string): string {
  try {
    const pathname = new URL(rawUrl, 'http://bff.local').pathname;
    let decoded = pathname;
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    }
    return decoded.replace(/\/{2,}/g, '/').toLocaleLowerCase('en-US');
  } catch {
    return '/invalid-path';
  }
}

export function isAdministrativePath(rawUrl: string, patterns: readonly string[]): boolean {
  const path = canonicalizePath(rawUrl);
  return patterns.some(pattern => {
    if (!pattern.endsWith('/*')) {
      return path === pattern;
    }

    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  });
}

export async function authorizeProxyRequest(
  request: AnyFastifyRequest,
  reply: AnyFastifyReply,
  config: AppConfig
): Promise<void> {
  if (!request.identity) {
    await reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Autenticação obrigatória.',
      correlationId: request.id,
    });
    return;
  }

  if (
    isAdministrativePath(request.raw.url ?? request.url, config.adminPaths) &&
    !request.identity.isAdmin
  ) {
    await reply.code(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Acesso administrativo não autorizado.',
      correlationId: request.id,
    });
  }
}
