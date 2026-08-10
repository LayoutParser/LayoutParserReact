import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  await readFile(path.join(repositoryRoot, 'contracts', 'api-endpoints.json'), 'utf8')
);

const knownEndpoints = new Set(
  manifest.endpoints.map(
    endpoint => `${endpoint.method.toUpperCase()} ${endpoint.path.replace(/:[^/]+/g, ':param')}`
  )
);

const serviceRoot = path.join(repositoryRoot, 'src', 'services');
const serviceFiles = (await readdir(serviceRoot, { recursive: true }))
  .filter(file => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  .map(file => path.join(serviceRoot, file));

const normalizePath = rawPath =>
  rawPath
    .replace(/\?.*$/, '')
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\{[^/}]+\}/g, ':param')
    .replace(/:[^/]+/g, ':param')
    .replace(/\/$/, '');

const discovered = [];
const callPattern =
  /apiClient\.(get|post|put|patch|delete)(?:<[\s\S]{0,1000}?>)?\(\s*[`'"]([^`'"]+)[`'"]/g;

for (const serviceFile of serviceFiles) {
  const content = await readFile(serviceFile, 'utf8');
  for (const match of content.matchAll(callPattern)) {
    const method = match[1].toUpperCase();
    const endpointPath = normalizePath(match[2]);
    if (endpointPath.startsWith('/api/')) {
      discovered.push({
        method,
        path: endpointPath,
        file: path.relative(repositoryRoot, serviceFile),
      });
    }
  }
}

// parseService usa a constante tipada API_CONFIG.endpoints.parse em vez de literal no post.
discovered.push({ method: 'POST', path: '/api/parse/upload', file: 'src/services/api.ts' });

const missing = discovered.filter(({ method, path: endpointPath }) => {
  const canonicalPath = endpointPath.replace(/:[^/]+/g, ':param');
  if (knownEndpoints.has(`${method} ${canonicalPath}`)) return false;
  return !manifest.endpoints.some(
    endpoint =>
      endpoint.method === method &&
      (endpointPath.startsWith(`${endpoint.path}/`) || endpoint.path.startsWith(`${endpointPath}/`))
  );
});

if (missing.length > 0) {
  throw new Error(
    `Endpoints usados pelo front sem contrato registrado:\n${missing
      .map(item => `- ${item.method} ${item.path} (${item.file})`)
      .join('\n')}`
  );
}

const discoveredKeys = new Set(
  discovered.map(
    ({ method, path: endpointPath }) => `${method} ${endpointPath.replace(/:[^/]+/g, ':param')}`
  )
);
const stale = manifest.endpoints.filter(
  endpoint =>
    !discoveredKeys.has(`${endpoint.method.toUpperCase()} ${normalizePath(endpoint.path)}`)
);
if (stale.length > 0) {
  throw new Error(
    `Endpoints registrados sem consumidor no front/BFF:\n${stale
      .map(endpoint => `- ${endpoint.method} ${endpoint.path}`)
      .join('\n')}`
  );
}

const openApiUrl = process.env.LAYOUTPARSER_OPENAPI_URL;
if (openApiUrl) {
  const response = await fetch(openApiUrl, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`OpenAPI indisponível: HTTP ${response.status}`);
  const document = await response.json();
  const remoteEndpoints = new Set(
    Object.entries(document.paths ?? {}).flatMap(([endpointPath, operations]) =>
      Object.keys(operations)
        .filter(method =>
          ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)
        )
        .map(method => `${method.toUpperCase()} ${normalizePath(endpointPath)}`)
    )
  );

  const apiOwned = manifest.endpoints.filter(endpoint => endpoint.owner === 'LayoutParserApi');
  const absentRemotely = apiOwned.filter(
    endpoint => !remoteEndpoints.has(`${endpoint.method} ${normalizePath(endpoint.path)}`)
  );
  if (absentRemotely.length > 0) {
    throw new Error(
      `Contrato divergiu do OpenAPI:\n${absentRemotely
        .map(endpoint => `- ${endpoint.method} ${endpoint.path}`)
        .join('\n')}`
    );
  }
}

console.log(
  `Contrato validado: ${discovered.length} usos no front, ${manifest.endpoints.length} endpoints registrados${openApiUrl ? ' e OpenAPI conferido' : ''}.`
);
