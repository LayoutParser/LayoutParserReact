import { createHash, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

import { ConfidentialClientApplication } from '@azure/msal-node';
import type { FastifyInstance } from 'fastify';

import type { SessionIdentity } from './auth.js';
import type { AppConfig, EntraConfig } from './config.js';

const OIDC_SCOPES = ['openid', 'profile', 'email'];
const AUTH_VALUE_PATTERN = /^[A-Za-z0-9_-]{20,512}$/;
const SESSION_KEY_INFO = Buffer.from('LayoutParserReact/BFF/session/v1', 'utf8');
const AUTH_LOGIN_RATE_LIMIT = { max: 20, timeWindow: 60_000 } as const;
const AUTH_CALLBACK_RATE_LIMIT = { max: 60, timeWindow: 60_000 } as const;
const AUTH_LOGOUT_RATE_LIMIT = { max: 30, timeWindow: 60_000 } as const;

export interface OidcTransaction {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly returnTo: string;
  readonly createdAt: number;
}

export interface OidcExchangeRequest {
  readonly code: string;
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
}

export interface OidcClient {
  getAuthorizationUrl(transaction: OidcTransaction): Promise<string>;
  exchangeAuthorizationCode(request: OidcExchangeRequest): Promise<SessionIdentity>;
}

interface LoginQuery {
  returnTo?: string;
}

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

type TokenClaims = Record<string, unknown>;

function base64UrlRandom(byteLength: number): string {
  return randomBytes(byteLength).toString('base64url');
}

function createTransaction(returnTo: string): OidcTransaction {
  const codeVerifier = base64UrlRandom(48);
  return {
    state: base64UrlRandom(32),
    nonce: base64UrlRandom(32),
    codeVerifier,
    codeChallenge: createHash('sha256').update(codeVerifier).digest('base64url'),
    returnTo,
    createdAt: Date.now(),
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeReturnTo(value: string | undefined, publicOrigin: string): string {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  if (value.includes('\\') || [...value].some(character => (character.codePointAt(0) ?? 0) < 32)) {
    return '/';
  }

  try {
    const target = new URL(value, publicOrigin);
    if (target.origin !== publicOrigin) {
      return '/';
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

function readStringClaim(claims: TokenClaims, name: string): string | null {
  const value = claims[name];
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 256 ? normalized : null;
}

function readRoles(claims: TokenClaims): readonly string[] {
  const value = claims.roles;
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((role): role is string => typeof role === 'string')
        .map(role => role.trim())
        .filter(role => role.length > 0 && role.length <= 256)
    ),
  ].slice(0, 50);
}

function identityFromClaims(
  claims: TokenClaims,
  fallbackUsername: string | undefined,
  fallbackSubject: string,
  fallbackTenantId: string
): SessionIdentity {
  const name =
    readStringClaim(claims, 'preferred_username') ??
    readStringClaim(claims, 'email') ??
    fallbackUsername?.trim();
  const subject =
    readStringClaim(claims, 'oid') ?? readStringClaim(claims, 'sub') ?? fallbackSubject.trim();
  const tenantId = readStringClaim(claims, 'tid') ?? fallbackTenantId.trim();

  if (!name || !subject || !tenantId) {
    throw new Error('O token autenticado não contém uma identidade utilizável.');
  }

  return { name, roles: readRoles(claims), subject, tenantId };
}

class MsalOidcClient implements OidcClient {
  readonly #configuration: EntraConfig;
  readonly #client: ConfidentialClientApplication;

  public constructor(configuration: EntraConfig) {
    this.#configuration = configuration;
    this.#client = new ConfidentialClientApplication({
      auth: {
        clientId: configuration.clientId,
        authority: configuration.authority,
        clientSecret: configuration.clientSecret,
      },
    });
  }

  public getAuthorizationUrl(transaction: OidcTransaction): Promise<string> {
    return this.#client.getAuthCodeUrl({
      scopes: [...OIDC_SCOPES],
      redirectUri: this.#configuration.redirectUri,
      state: transaction.state,
      nonce: transaction.nonce,
      codeChallenge: transaction.codeChallenge,
      codeChallengeMethod: 'S256',
      prompt: 'select_account',
    });
  }

  public async exchangeAuthorizationCode(request: OidcExchangeRequest): Promise<SessionIdentity> {
    try {
      const result = await this.#client.acquireTokenByCode(
        {
          code: request.code,
          scopes: [...OIDC_SCOPES],
          redirectUri: this.#configuration.redirectUri,
          codeVerifier: request.codeVerifier,
          state: request.state,
        },
        {
          code: request.code,
          state: request.state,
          nonce: request.nonce,
        }
      );

      return identityFromClaims(
        result.idTokenClaims as TokenClaims,
        result.account?.username,
        result.uniqueId,
        result.tenantId
      );
    } finally {
      // O aplicativo usa o token apenas para validar o login. Não chama Graph nem mantém refresh
      // tokens; limpar o cache evita prolongar credenciais Microsoft na memória do processo.
      this.#client.clearCache();
    }
  }
}

export function deriveSessionKey(config: AppConfig): Buffer {
  if (!config.entra) {
    return randomBytes(32);
  }

  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(config.entra.clientSecret, 'utf8'),
      Buffer.from(config.entra.clientId, 'utf8'),
      SESSION_KEY_INFO,
      32
    )
  );
}

export function createOidcClient(config: AppConfig): OidcClient | null {
  return config.entra ? new MsalOidcClient(config.entra) : null;
}

function errorPageLocation(code: string): string {
  return `/upload?authError=${encodeURIComponent(code)}`;
}

export function registerAuthenticationRoutes(
  app: FastifyInstance,
  config: AppConfig,
  client: OidcClient | null
): void {
  app.get<{ Querystring: LoginQuery }>(
    '/auth/login',
    { config: { rateLimit: AUTH_LOGIN_RATE_LIMIT } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      if (!client) {
        await reply.code(503).send({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Autenticação Microsoft não configurada neste ambiente.',
          correlationId: request.id,
        });
        return;
      }

      const returnTo = normalizeReturnTo(request.query.returnTo, config.publicOrigin);
      const transaction = createTransaction(returnTo);
      request.session.regenerate();
      request.session.set('oidcTransaction', transaction);

      try {
        const authorizationUrl = await client.getAuthorizationUrl(transaction);
        await reply.redirect(authorizationUrl, 302);
      } catch (error) {
        request.session.regenerate();
        request.log.error(
          {
            event: 'auth.login.start_failed',
            errorType: error instanceof Error ? error.name : 'UnknownError',
          },
          'Não foi possível iniciar a autenticação OIDC.'
        );
        await reply.redirect(errorPageLocation('temporarily_unavailable'), 303);
      }
    }
  );

  app.get<{ Querystring: CallbackQuery }>(
    '/auth/callback',
    { config: { rateLimit: AUTH_CALLBACK_RATE_LIMIT } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      const transaction = request.session.get('oidcTransaction');
      const code = request.query.code;
      const state = request.query.state;

      // O callback sempre abandona o cookie de transação antes de interpretar qualquer valor
      // fornecido pelo navegador. Assim, nenhum parâmetro decide se uma sessão será regenerada.
      request.session.regenerate();

      const transactionExpired =
        !transaction || Date.now() - transaction.createdAt > 10 * 60 * 1000;
      if (
        !client ||
        transactionExpired ||
        !state ||
        !AUTH_VALUE_PATTERN.test(state) ||
        !safeEqual(state, transaction.state)
      ) {
        await reply.redirect(errorPageLocation('invalid_callback'), 303);
        return;
      }

      if (request.query.error === 'access_denied') {
        await reply.redirect(errorPageLocation('access_denied'), 303);
        return;
      }

      if (request.query.error !== undefined || !code) {
        await reply.redirect(errorPageLocation('login_failed'), 303);
        return;
      }

      try {
        const identity = await client.exchangeAuthorizationCode({
          code,
          state,
          nonce: transaction.nonce,
          codeVerifier: transaction.codeVerifier,
        });
        const returnTo = transaction.returnTo;
        request.session.set('identity', identity);
        request.log.info({ event: 'auth.login.completed' }, 'Sessão OIDC criada.');
        await reply.redirect(returnTo, 303);
      } catch (error) {
        request.log.warn(
          {
            event: 'auth.login.callback_failed',
            errorType: error instanceof Error ? error.name : 'UnknownError',
          },
          'A resposta OIDC foi rejeitada.'
        );
        await reply.redirect(errorPageLocation('login_failed'), 303);
      }
    }
  );

  app.post(
    '/auth/logout',
    { config: { rateLimit: AUTH_LOGOUT_RATE_LIMIT } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      request.session.delete();
      await reply.redirect('/', 303);
    }
  );
}
