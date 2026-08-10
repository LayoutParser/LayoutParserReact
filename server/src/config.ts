import { isIP } from 'node:net';

const MEBIBYTE = 1024 * 1024;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const DOCUMENT_FIELD_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
const DEFAULT_ADMIN_PATHS = [
  '/api/monitoring/*',
  '/api/ai-metrics/*',
  '/api/layoutdatabase/refresh-cache',
  '/api/metrics',
];

export type NodeEnvironment = 'development' | 'test' | 'production';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface AppConfig {
  readonly nodeEnv: NodeEnvironment;
  readonly isProduction: boolean;
  readonly host: string;
  readonly port: number;
  readonly upstreamUrl: string;
  readonly requestLimitBytes: number;
  readonly documentLimitBytes: number;
  readonly documentField: string;
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  readonly trustedProxyIps: ReadonlySet<string>;
  readonly trustedUserHeader: string;
  readonly trustedRolesHeader: string;
  readonly adminUsers: ReadonlySet<string>;
  readonly adminRoles: ReadonlySet<string>;
  readonly adminPaths: readonly string[];
  readonly developmentAuthEnabled: boolean;
  readonly developmentUserHeader: string;
  readonly developmentRolesHeader: string;
  readonly logLevel: LogLevel;
}

export class ConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const environment = value?.trim() || 'development';
  if (environment !== 'development' && environment !== 'test' && environment !== 'production') {
    throw new ConfigError('NODE_ENV deve ser development, test ou production.');
  }

  return environment;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new ConfigError(`${name} deve ser um número inteiro.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ConfigError(`${name} deve estar entre ${minimum} e ${maximum}.`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new ConfigError(`${name} deve ser true ou false.`);
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeIp(value: string): string {
  const withoutZone = value.split('%', 1)[0] ?? value;
  if (withoutZone.startsWith('::ffff:')) {
    return withoutZone.slice('::ffff:'.length);
  }

  return withoutZone;
}

function parseTrustedProxyIps(value: string | undefined): ReadonlySet<string> {
  const addresses = parseCsv(value).map(normalizeIp);
  for (const address of addresses) {
    if (isIP(address) === 0) {
      throw new ConfigError(`BFF_TRUSTED_PROXY_IPS contém IP inválido: ${address}.`);
    }
  }

  return new Set(addresses);
}

function parseHeaderName(value: string | undefined, fallback: string, name: string): string {
  const header = value?.trim().toLowerCase() || fallback;
  if (!HEADER_NAME_PATTERN.test(header)) {
    throw new ConfigError(`${name} contém um nome de header inválido.`);
  }

  return header;
}

function parseUpstreamUrl(value: string | undefined, isProduction: boolean): string {
  if (isProduction && !value?.trim()) {
    throw new ConfigError('LAYOUTPARSER_API_URL é obrigatória em produção.');
  }

  let url: URL;
  try {
    url = new URL(value?.trim() || 'http://127.0.0.1:5000');
  } catch {
    throw new ConfigError('LAYOUTPARSER_API_URL deve ser uma URL HTTP(S) válida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ConfigError('LAYOUTPARSER_API_URL deve usar HTTP ou HTTPS.');
  }

  if (url.username || url.password) {
    throw new ConfigError('LAYOUTPARSER_API_URL não pode conter credenciais.');
  }

  if (url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new ConfigError(
      'LAYOUTPARSER_API_URL deve conter apenas a origem, sem path, query ou hash.'
    );
  }

  const isLoopback =
    url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1';
  if (isProduction && url.protocol !== 'https:' && !isLoopback) {
    throw new ConfigError('Em produção, um upstream remoto deve usar HTTPS.');
  }

  return url.origin;
}

function parseAdminPaths(value: string | undefined): readonly string[] {
  const paths = parseCsv(value);
  const selected = paths.length > 0 ? paths : DEFAULT_ADMIN_PATHS;

  for (const path of selected) {
    const wildcardCount = [...path].filter(character => character === '*').length;
    if (
      !path.startsWith('/api/') ||
      wildcardCount > 1 ||
      (wildcardCount === 1 && !path.endsWith('/*'))
    ) {
      throw new ConfigError(`BFF_ADMIN_PATHS contém padrão inválido: ${path}.`);
    }
  }

  return selected.map(path => path.toLowerCase());
}

function parseLogLevel(value: string | undefined): LogLevel {
  const selected = value?.trim() || 'info';
  const levels: readonly LogLevel[] = [
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace',
    'silent',
  ];
  if (!levels.includes(selected as LogLevel)) {
    throw new ConfigError('BFF_LOG_LEVEL é inválido.');
  }

  return selected as LogLevel;
}

function lowercaseSet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values.map(value => value.toLocaleLowerCase('en-US')));
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnvironment(environment.NODE_ENV);
  const isProduction = nodeEnv === 'production';
  const host = environment.BFF_HOST?.trim() || '127.0.0.1';
  const port = parseInteger(environment.BFF_PORT, 3100, 'BFF_PORT', 1, 65_535);
  const requestLimitMiB = parseInteger(
    environment.BFF_REQUEST_LIMIT_MIB,
    32,
    'BFF_REQUEST_LIMIT_MIB',
    1,
    1024
  );
  const documentLimitMiB = parseInteger(
    environment.BFF_DOCUMENT_LIMIT_MIB,
    25,
    'BFF_DOCUMENT_LIMIT_MIB',
    1,
    1024
  );
  const documentField = environment.BFF_DOCUMENT_FIELD?.trim() || 'txtFile';
  const trustedProxyIps = parseTrustedProxyIps(environment.BFF_TRUSTED_PROXY_IPS);
  const trustedUserHeader = parseHeaderName(
    environment.BFF_TRUSTED_USER_HEADER,
    'x-iis-user',
    'BFF_TRUSTED_USER_HEADER'
  );
  const trustedRolesHeader = parseHeaderName(
    environment.BFF_TRUSTED_ROLES_HEADER,
    'x-iis-roles',
    'BFF_TRUSTED_ROLES_HEADER'
  );
  const developmentAuthEnabled = parseBoolean(
    environment.BFF_DEV_AUTH_ENABLED,
    false,
    'BFF_DEV_AUTH_ENABLED'
  );
  const adminUsers = lowercaseSet(parseCsv(environment.BFF_ADMIN_USERS));
  const adminRoles = lowercaseSet(parseCsv(environment.BFF_ADMIN_ROLES));
  const upstreamUrl = parseUpstreamUrl(environment.LAYOUTPARSER_API_URL, isProduction);

  if (!DOCUMENT_FIELD_PATTERN.test(documentField)) {
    throw new ConfigError('BFF_DOCUMENT_FIELD contém um nome de campo inválido.');
  }

  if (documentLimitMiB > requestLimitMiB) {
    throw new ConfigError('BFF_DOCUMENT_LIMIT_MIB não pode exceder BFF_REQUEST_LIMIT_MIB.');
  }

  if (isProduction) {
    if (host !== '127.0.0.1' && host !== '::1') {
      throw new ConfigError('Em produção, BFF_HOST deve apontar para loopback (127.0.0.1 ou ::1).');
    }

    if (trustedProxyIps.size === 0) {
      throw new ConfigError('BFF_TRUSTED_PROXY_IPS é obrigatória em produção.');
    }

    if (!environment.BFF_TRUSTED_USER_HEADER?.trim()) {
      throw new ConfigError('BFF_TRUSTED_USER_HEADER é obrigatória em produção.');
    }

    if (developmentAuthEnabled) {
      throw new ConfigError('BFF_DEV_AUTH_ENABLED não pode ser true em produção.');
    }

    if (adminUsers.size === 0 && adminRoles.size === 0) {
      throw new ConfigError('Configure BFF_ADMIN_USERS e/ou BFF_ADMIN_ROLES em produção.');
    }
  }

  return {
    nodeEnv,
    isProduction,
    host,
    port,
    upstreamUrl,
    requestLimitBytes: requestLimitMiB * MEBIBYTE,
    documentLimitBytes: documentLimitMiB * MEBIBYTE,
    documentField,
    rateLimitMax: parseInteger(
      environment.BFF_RATE_LIMIT_MAX,
      120,
      'BFF_RATE_LIMIT_MAX',
      1,
      1_000_000
    ),
    rateLimitWindowMs: parseInteger(
      environment.BFF_RATE_LIMIT_WINDOW_MS,
      60_000,
      'BFF_RATE_LIMIT_WINDOW_MS',
      1000,
      86_400_000
    ),
    trustedProxyIps,
    trustedUserHeader,
    trustedRolesHeader,
    adminUsers,
    adminRoles,
    adminPaths: parseAdminPaths(environment.BFF_ADMIN_PATHS),
    developmentAuthEnabled,
    developmentUserHeader: parseHeaderName(
      environment.BFF_DEV_USER_HEADER,
      'x-dev-user',
      'BFF_DEV_USER_HEADER'
    ),
    developmentRolesHeader: parseHeaderName(
      environment.BFF_DEV_ROLES_HEADER,
      'x-dev-roles',
      'BFF_DEV_ROLES_HEADER'
    ),
    logLevel: parseLogLevel(environment.BFF_LOG_LEVEL),
  };
}
