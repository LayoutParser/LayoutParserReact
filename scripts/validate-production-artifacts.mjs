import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(repositoryRoot, 'dist');

const walk = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    })
  );
  return nested.flat();
};

const files = await walk(distRoot);
const sourceMaps = files.filter(file => file.endsWith('.map'));

if (sourceMaps.length > 0) {
  throw new Error(`Build de produção publicou source maps: ${sourceMaps.join(', ')}`);
}

const publicAssets = files.filter(file => /\.(?:html|js|css)$/i.test(file));
for (const file of publicAssets) {
  const content = await readFile(file, 'utf8');
  if (
    /http:\/\/[^"'\s)]*:5000|layoutparser\.local|LayoutParserAdmins|VITE_DEV_BFF/i.test(content)
  ) {
    throw new Error(
      `Bundle contém configuração interna/de desenvolvimento: ${path.relative(distRoot, file)}`
    );
  }
}

const webConfig = await readFile(path.join(distRoot, 'web.config'), 'utf8');
for (const requiredFragment of [
  'LayoutParser API Gateway',
  'LayoutParser Authentication Gateway',
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  "style-src 'self'",
]) {
  if (!webConfig.includes(requiredFragment)) {
    throw new Error(`web.config de produção não contém: ${requiredFragment}`);
  }
}

if (/unsafe-inline|unsafe-eval/i.test(webConfig)) {
  throw new Error('web.config de produção permite execução inline insegura na CSP.');
}

if (/<(?:anonymous|windows)Authentication\b/i.test(webConfig)) {
  throw new Error(
    'Autenticação IIS deve ser configurada no applicationHost.config, não no web.config.'
  );
}

const deployScript = await readFile(path.join(repositoryRoot, 'scripts', 'Deploy-Iis.ps1'), 'utf8');
for (const requiredFragment of [
  'system.webServer/security/authentication/windowsAuthentication',
  'system.webServer/security/authentication/anonymousAuthentication',
  "Enabled = 'true'",
  "Enabled = 'false'",
  'ENTRA_CLIENT_SECRET',
  "'/commit:apphost'",
]) {
  if (!deployScript.includes(requiredFragment)) {
    throw new Error(`Deploy IIS não contém configuração obrigatória: ${requiredFragment}`);
  }
}

console.log(
  `Artefatos de produção validados (${files.length} arquivos, sem source maps/IP interno).`
);
