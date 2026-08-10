#!/usr/bin/env node
/**
 * Bloqueia edicoes diretas em metadados Git, segredos locais e lockfiles.
 *
 * O hook aceita Write/Edit e tambem detecta comandos Bash/PowerShell obviamente
 * mutantes. Gerenciadores de pacote continuam livres para atualizar lockfiles.
 * Nunca imprime conteudo de arquivo ou valor de segredo.
 */
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_ENV_FILES = new Set(['.env.example', '.env.development', '.env.production']);
const LOCK_FILES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
]);
const SECRET_FILE_NAMES = new Set([
  '.mcp.json',
  '.npmrc',
  '.pypirc',
  'credentials.json',
  'secrets.json',
  'secrets.yaml',
  'secrets.yml',
  'service-account.json',
]);
const PRIVATE_KEY_EXTENSIONS = new Set(['.key', '.pem', '.p12', '.pfx']);

function readStdin() {
  return new Promise(resolve => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      input += chunk;
    });
    process.stdin.on('end', () => resolve(input));
  });
}

function resolvePhysicalPath(candidate) {
  const absolute = path.resolve(candidate);

  try {
    return fs.realpathSync.native(absolute);
  } catch {
    let existingParent = path.dirname(absolute);
    const missingSegments = [path.basename(absolute)];

    while (existingParent !== path.dirname(existingParent) && !fs.existsSync(existingParent)) {
      missingSegments.unshift(path.basename(existingParent));
      existingParent = path.dirname(existingParent);
    }

    try {
      return path.join(fs.realpathSync.native(existingParent), ...missingSegments);
    } catch {
      return absolute;
    }
  }
}

function classifyPath(filePath, cwd) {
  if (typeof filePath !== 'string' || filePath.trim() === '') return null;

  const absolute = path.resolve(cwd || process.cwd(), filePath);
  const candidates = new Set([absolute, resolvePhysicalPath(absolute)]);

  for (const candidate of candidates) {
    const segments = candidate.split(/[\\/]+/).map(segment => segment.toLowerCase());
    const baseName = path.basename(candidate).toLowerCase();
    const extension = path.extname(baseName);

    if (segments.includes('.git')) {
      return 'metadados internos do Git (.git)';
    }

    if (LOCK_FILES.has(baseName)) {
      return `lockfile ${baseName}; altere dependencias pelo gerenciador de pacotes`;
    }

    if (baseName.startsWith('.env') && !PUBLIC_ENV_FILES.has(baseName)) {
      return `arquivo de ambiente local ${baseName}`;
    }

    if (SECRET_FILE_NAMES.has(baseName) || PRIVATE_KEY_EXTENSIONS.has(extension)) {
      return `arquivo sensivel ${baseName}`;
    }
  }

  return null;
}

function commandMutatesFiles(command) {
  return (
    /\b(?:set-content|add-content|clear-content|out-file|remove-item|move-item|copy-item|rename-item|new-item)\b/i.test(
      command
    ) ||
    /(?:^|[;&|]\s*)(?:rm|mv|cp|del|erase|ren|move|copy|tee|truncate|touch)\b/i.test(command) ||
    /\b(?:apply_patch|writefilesync|appendfilesync|unlinksync|renamesync)\b/i.test(command) ||
    /\bgit\s+(?:checkout|restore|reset|clean|apply)\b/i.test(command) ||
    /(?:^|\s)>{1,2}\s*[^&]/.test(command) ||
    /\b(?:sed|perl)\b[^\r\n]*\s-i(?:\s|$)/i.test(command)
  );
}

function classifyCommand(command) {
  if (typeof command !== 'string' || !commandMutatesFiles(command)) return null;

  if (/(?:^|[\s"'`])\.git(?:[\\/\s"'`]|$)/i.test(command)) {
    return 'comando mutante direcionado a .git';
  }

  const envMatches = command.match(/\.env(?:\.[a-z0-9_-]+)*/gi) || [];
  const privateEnv = envMatches.find(name => !PUBLIC_ENV_FILES.has(name.toLowerCase()));
  if (privateEnv) return `comando mutante direcionado a ${privateEnv}`;

  for (const lockFile of LOCK_FILES) {
    if (command.toLowerCase().includes(lockFile)) {
      return `edicao manual de ${lockFile}; use npm/pnpm/yarn/bun`;
    }
  }

  for (const secretName of SECRET_FILE_NAMES) {
    if (command.toLowerCase().includes(secretName)) {
      return `comando mutante direcionado a ${secretName}`;
    }
  }

  if (/\.(?:key|pem|p12|pfx)(?:[\s"'`]|$)/i.test(command)) {
    return 'comando mutante direcionado a chave ou certificado privado';
  }

  return null;
}

function block(reason) {
  process.stderr.write(
    `[harness] Operacao bloqueada: ${reason}. ` +
      'Use um arquivo .example para configuracao publica ou o gerenciador apropriado.\n'
  );
  process.exit(2);
}

readStdin()
  .then(rawInput => {
    let event;
    try {
      event = JSON.parse(rawInput || '{}');
    } catch {
      process.exit(0);
      return;
    }

    const toolName = event && event.tool_name;
    const toolInput = (event && event.tool_input) || {};

    if (toolName === 'Write' || toolName === 'Edit') {
      const reason = classifyPath(toolInput.file_path, event.cwd);
      if (reason) block(reason);
    }

    if (toolName === 'Bash') {
      const reason = classifyCommand(toolInput.command);
      if (reason) block(reason);
    }

    process.exit(0);
  })
  .catch(() => process.exit(0));
