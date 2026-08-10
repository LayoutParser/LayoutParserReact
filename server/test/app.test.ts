import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';

import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

interface CapturedRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: IncomingHttpHeaders;
  readonly body: Buffer;
}

interface UpstreamHarness {
  readonly url: string;
  readonly requests: CapturedRequest[];
  close(): Promise<void>;
}

const apps: FastifyInstance[] = [];
const upstreams: UpstreamHarness[] = [];

async function createUpstream(): Promise<UpstreamHarness> {
  const requests: CapturedRequest[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(Buffer.from(chunk)));
    request.on('end', () => {
      const captured: CapturedRequest = {
        method: request.method ?? 'UNKNOWN',
        url: request.url ?? '/',
        headers: request.headers,
        body: Buffer.concat(chunks),
      };
      requests.push(captured);
      response.statusCode = 200;
      response.setHeader('content-type', 'application/json');
      response.setHeader('server', 'integration-upstream');
      response.setHeader('x-powered-by', 'integration-upstream');
      response.end(
        JSON.stringify({
          method: captured.method,
          url: captured.url,
          correlationId: captured.headers['x-correlation-id'] ?? null,
        })
      );
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))),
  };
}

async function createApp(
  overrides: NodeJS.ProcessEnv = {},
  options: Parameters<typeof buildApp>[1] = {}
): Promise<{ app: FastifyInstance; upstream: UpstreamHarness }> {
  const upstream = await createUpstream();
  const config = loadConfig({
    NODE_ENV: 'test',
    LAYOUTPARSER_API_URL: upstream.url,
    BFF_DEV_AUTH_ENABLED: 'true',
    BFF_ADMIN_USERS: 'admin.user',
    BFF_ADMIN_ROLES: 'LayoutParserAdmins',
    ...overrides,
  });
  const app = await buildApp(
    config,
    options.logStream || options.logger !== undefined ? options : { logger: false }
  );
  await app.ready();
  apps.push(app);
  upstreams.push(upstream);
  return { app, upstream };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()));
  await Promise.all(upstreams.splice(0).map(upstream => upstream.close()));
});

describe('LayoutParser BFF', () => {
  it('expõe health sem autenticação, com Helmet e correlation id', async () => {
    const { app } = await createApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'layout-parser-bff' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['ratelimit-limit']).toBeUndefined();
  });

  it('reserva GET /api/session no BFF e devolve o contrato determinístico', async () => {
    const { app, upstream } = await createApp();

    const anonymous = await app.inject({ method: 'GET', url: '/api/session' });
    expect(anonymous.json()).toEqual({
      authenticated: false,
      user: { name: '' },
      roles: [],
      isAdmin: false,
    });

    const authenticated = await app.inject({
      method: 'GET',
      url: '/api/session',
      headers: { 'x-dev-user': 'student.user', 'x-dev-roles': 'Users,LayoutParserAdmins' },
    });
    expect(authenticated.json()).toEqual({
      authenticated: true,
      user: { name: 'student.user' },
      roles: ['Users', 'LayoutParserAdmins'],
      isAdmin: true,
    });
    expect(upstream.requests).toHaveLength(0);
  });

  it('em produção aceita somente o trusted header vindo do proxy permitido', async () => {
    const upstream = await createUpstream();
    const config = loadConfig({
      NODE_ENV: 'production',
      LAYOUTPARSER_API_URL: upstream.url,
      BFF_TRUSTED_PROXY_IPS: '127.0.0.1',
      BFF_TRUSTED_USER_HEADER: 'x-iis-user',
      BFF_TRUSTED_ROLES_HEADER: 'x-iis-roles',
      BFF_ADMIN_ROLES: 'LayoutParserAdmins',
    });
    const app = await buildApp(config, { logger: false });
    await app.ready();
    apps.push(app);
    upstreams.push(upstream);

    const trusted = await app.inject({
      method: 'GET',
      url: '/api/session',
      headers: { 'x-iis-user': 'domain.user', 'x-iis-roles': 'LayoutParserAdmins' },
      remoteAddress: '127.0.0.1',
    });
    const developmentHeader = await app.inject({
      method: 'GET',
      url: '/api/session',
      headers: { 'x-dev-user': 'spoofed.user' },
      remoteAddress: '127.0.0.1',
    });
    const untrustedPeer = await app.inject({
      method: 'GET',
      url: '/api/session',
      headers: { 'x-iis-user': 'spoofed.user' },
      remoteAddress: '192.0.2.10',
    });

    expect(trusted.json()).toEqual({
      authenticated: true,
      user: { name: 'domain.user' },
      roles: ['LayoutParserAdmins'],
      isAdmin: true,
    });
    expect(trusted.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(developmentHeader.json()).toMatchObject({ authenticated: false, isAdmin: false });
    expect(untrustedPeer.json()).toMatchObject({ authenticated: false, isAdmin: false });
  });

  it('preserva correlation id válido e substitui valor inseguro', async () => {
    const { app } = await createApp();

    const valid = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'academic-request-123' },
    });
    const invalid = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': 'bad id' },
    });

    expect(valid.headers['x-correlation-id']).toBe('academic-request-123');
    expect(invalid.headers['x-correlation-id']).not.toBe('bad id');
  });

  it('exige autenticação e preserva path, query, método e identidade no proxy', async () => {
    const { app, upstream } = await createApp();

    const unauthorized = await app.inject({ method: 'GET', url: '/api/layouts?page=1' });
    expect(unauthorized.statusCode).toBe(401);
    expect(upstream.requests).toHaveLength(0);

    const response = await app.inject({
      method: 'POST',
      url: '/api/layouts?page=1',
      headers: {
        'content-type': 'text/plain',
        'x-dev-user': 'student.user',
        'x-dev-roles': 'Users',
      },
      payload: 'document body',
    });

    expect(response.statusCode).toBe(200);
    expect(upstream.requests).toHaveLength(1);
    expect(upstream.requests[0]).toMatchObject({
      method: 'POST',
      url: '/api/layouts?page=1',
    });
    expect(upstream.requests[0]?.body.toString()).toBe('document body');
    expect(upstream.requests[0]?.headers['x-iis-user']).toBe('student.user');
    expect(upstream.requests[0]?.headers['x-iis-roles']).toBe('Users');
    expect(upstream.requests[0]?.headers['x-dev-user']).toBeUndefined();
    expect(upstream.requests[0]?.headers['x-correlation-id']).toBe(
      response.headers['x-correlation-id']
    );
    expect(response.headers.server).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('protege endpoints administrativos por allowlist de usuário ou role', async () => {
    const { app, upstream } = await createApp();

    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/monitoring/layouts-analysis',
      headers: { 'x-dev-user': 'student.user', 'x-dev-roles': 'Users' },
    });
    expect(forbidden.statusCode).toBe(403);
    expect(upstream.requests).toHaveLength(0);

    const allowed = await app.inject({
      method: 'GET',
      url: '/API/MONITORING/layouts-analysis',
      headers: { 'x-dev-user': 'admin.user' },
    });
    expect(allowed.statusCode).toBe(200);
    expect(upstream.requests).toHaveLength(1);
  });

  it('protege também caminhos administrativos com encoding repetido', async () => {
    const { app, upstream } = await createApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/%256donitoring/layouts-analysis',
      headers: { 'x-dev-user': 'student.user' },
    });

    expect(response.statusCode).toBe(403);
    expect(upstream.requests).toHaveLength(0);
  });

  it('aplica rate limiting por identidade', async () => {
    const { app } = await createApp({ BFF_RATE_LIMIT_MAX: '1' });
    const request = {
      method: 'GET' as const,
      url: '/api/session',
      headers: { 'x-dev-user': 'student.user' },
    };

    expect((await app.inject(request)).statusCode).toBe(200);
    const blocked = await app.inject(request);
    expect(blocked.statusCode, blocked.body).toBe(429);
    expect(blocked.json()).toMatchObject({ message: 'Limite de requisições excedido.' });
  });

  it('rejeita request total acima do limite antes de chamar o upstream', async () => {
    const { app, upstream } = await createApp({
      BFF_REQUEST_LIMIT_MIB: '1',
      BFF_DOCUMENT_LIMIT_MIB: '1',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/upload',
      headers: { 'content-type': 'application/octet-stream', 'x-dev-user': 'student.user' },
      payload: Buffer.alloc(1024 * 1024 + 1),
    });

    expect(response.statusCode, response.body).toBe(413);
    expect(response.json()).toMatchObject({ message: 'A requisição excede o limite permitido.' });
    expect(upstream.requests).toHaveLength(0);
  });

  it('rejeita txtFile acima do limite de documento mesmo abaixo do limite total', async () => {
    const { app, upstream } = await createApp({
      BFF_REQUEST_LIMIT_MIB: '2',
      BFF_DOCUMENT_LIMIT_MIB: '1',
    });
    const form = new FormData();
    form.append('txtFile', new Blob([Buffer.alloc(1024 * 1024 + 1)]), 'document.txt');
    const encoded = new Request('http://bff.local/api/parse', { method: 'POST', body: form });
    const response = await app.inject({
      method: 'POST',
      url: '/api/parse',
      headers: {
        'content-type': encoded.headers.get('content-type') ?? '',
        'x-dev-user': 'student.user',
      },
      payload: Buffer.from(await encoded.arrayBuffer()),
    });

    expect(response.statusCode, response.body).toBe(413);
    expect(response.json()).toMatchObject({ message: 'O documento excede o limite permitido.' });
    expect(upstream.requests).toHaveLength(0);
  });

  it('gera logs JSON estruturados sem registrar corpo TXT ou XML', async () => {
    let logs = '';
    const logStream = new Writable({
      write(chunk, _encoding, callback) {
        logs += chunk.toString();
        callback();
      },
    });
    const { app } = await createApp({}, { logStream });
    const sensitiveBody = '<document>CONFIDENTIAL-TXT-XML-CONTENT</document>';

    const response = await app.inject({
      method: 'POST',
      url: '/api/log-test',
      headers: { 'content-type': 'application/xml', 'x-dev-user': 'student.user' },
      payload: sensitiveBody,
    });

    expect(response.statusCode).toBe(200);
    expect(logs).toContain('http.request.completed');
    expect(logs).not.toContain(sensitiveBody);
    expect(logs).not.toContain('CONFIDENTIAL-TXT-XML-CONTENT');
    for (const line of logs.trim().split('\n')) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
