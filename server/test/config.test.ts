import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('aplica defaults seguros de desenvolvimento', () => {
    const config = loadConfig({ NODE_ENV: 'development' });

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3100);
    expect(config.upstreamUrl).toBe('http://127.0.0.1:5000');
    expect(config.requestLimitBytes).toBe(32 * 1024 * 1024);
    expect(config.documentLimitBytes).toBe(25 * 1024 * 1024);
    expect(config.developmentAuthEnabled).toBe(false);
  });

  it('carrega uma configuração de produção segura', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      LAYOUTPARSER_API_URL: 'https://layout-parser.internal',
      BFF_TRUSTED_PROXY_IPS: '127.0.0.1,::1',
      BFF_TRUSTED_USER_HEADER: 'X-IIS-User',
      BFF_ADMIN_ROLES: 'LayoutParserAdmins',
    });

    expect(config.isProduction).toBe(true);
    expect(config.trustedProxyIps).toEqual(new Set(['127.0.0.1', '::1']));
    expect(config.trustedUserHeader).toBe('x-iis-user');
    expect(config.adminRoles.has('layoutparseradmins')).toBe(true);
  });

  it.each([
    [{ NODE_ENV: 'production' }, 'LAYOUTPARSER_API_URL'],
    [
      {
        NODE_ENV: 'production',
        LAYOUTPARSER_API_URL: 'https://layout-parser.internal',
        BFF_TRUSTED_USER_HEADER: 'x-iis-user',
        BFF_ADMIN_ROLES: 'admins',
      },
      'BFF_TRUSTED_PROXY_IPS',
    ],
    [
      {
        NODE_ENV: 'production',
        LAYOUTPARSER_API_URL: 'https://layout-parser.internal',
        BFF_TRUSTED_PROXY_IPS: '127.0.0.1',
        BFF_ADMIN_ROLES: 'admins',
      },
      'BFF_TRUSTED_USER_HEADER',
    ],
    [
      {
        NODE_ENV: 'production',
        LAYOUTPARSER_API_URL: 'https://layout-parser.internal',
        BFF_TRUSTED_PROXY_IPS: '127.0.0.1',
        BFF_TRUSTED_USER_HEADER: 'x-iis-user',
      },
      'BFF_ADMIN_USERS',
    ],
  ])('falha em produção sem configuração obrigatória: %s', (environment, expectedMessage) => {
    expect(() => loadConfig(environment)).toThrowError(expectedMessage);
  });

  it('proíbe autenticação de desenvolvimento em produção', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        LAYOUTPARSER_API_URL: 'https://layout-parser.internal',
        BFF_TRUSTED_PROXY_IPS: '127.0.0.1',
        BFF_TRUSTED_USER_HEADER: 'x-iis-user',
        BFF_ADMIN_ROLES: 'admins',
        BFF_DEV_AUTH_ENABLED: 'true',
      })
    ).toThrowError('BFF_DEV_AUTH_ENABLED');
  });

  it('proíbe bind não local e upstream HTTP remoto em produção', () => {
    const base = {
      NODE_ENV: 'production',
      BFF_TRUSTED_PROXY_IPS: '127.0.0.1',
      BFF_TRUSTED_USER_HEADER: 'x-iis-user',
      BFF_ADMIN_ROLES: 'admins',
    };

    expect(() =>
      loadConfig({ ...base, BFF_HOST: '0.0.0.0', LAYOUTPARSER_API_URL: 'https://api.internal' })
    ).toThrowError('loopback');
    expect(() => loadConfig({ ...base, LAYOUTPARSER_API_URL: 'http://api.internal' })).toThrowError(
      'HTTPS'
    );
  });

  it('aceita HTTP local em produção sem incluir credenciais na URL', () => {
    const base = {
      NODE_ENV: 'production',
      BFF_TRUSTED_PROXY_IPS: '127.0.0.1',
      BFF_TRUSTED_USER_HEADER: 'x-iis-user',
      BFF_ADMIN_ROLES: 'admins',
    };

    expect(loadConfig({ ...base, LAYOUTPARSER_API_URL: 'http://127.0.0.1:5000' }).upstreamUrl).toBe(
      'http://127.0.0.1:5000'
    );
    expect(() =>
      loadConfig({ ...base, LAYOUTPARSER_API_URL: 'https://user:secret@api.internal' })
    ).toThrowError('credenciais');
  });

  it('valida limites, tipos e padrões administrativos', () => {
    expect(() =>
      loadConfig({ BFF_REQUEST_LIMIT_MIB: '10', BFF_DOCUMENT_LIMIT_MIB: '11' })
    ).toThrowError(ConfigError);
    expect(() => loadConfig({ BFF_DEV_AUTH_ENABLED: 'yes' })).toThrowError('true ou false');
    expect(() => loadConfig({ BFF_TRUSTED_PROXY_IPS: 'not-an-ip' })).toThrowError('IP inválido');
    expect(() => loadConfig({ BFF_ADMIN_PATHS: '/api/admin/*/nested' })).toThrowError(
      'padrão inválido'
    );
  });

  it.each([
    [{ NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ BFF_PORT: '3.14' }, 'número inteiro'],
    [{ BFF_PORT: '70000' }, 'entre 1 e 65535'],
    [{ BFF_TRUSTED_USER_HEADER: 'bad header' }, 'header inválido'],
    [{ BFF_DOCUMENT_FIELD: 'bad field!' }, 'campo inválido'],
    [{ LAYOUTPARSER_API_URL: 'ftp://api.internal' }, 'HTTP ou HTTPS'],
    [{ LAYOUTPARSER_API_URL: 'https://api.internal/base' }, 'sem path'],
    [{ BFF_LOG_LEVEL: 'verbose' }, 'BFF_LOG_LEVEL'],
  ])('recusa configuração malformada: %s', (environment, expectedMessage) => {
    expect(() => loadConfig(environment)).toThrowError(expectedMessage);
  });
});
