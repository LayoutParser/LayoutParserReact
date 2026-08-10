#!/usr/bin/env node
/**
 * Feedback rapido apos Write/Edit em src/.
 *
 * Formata apenas o arquivo alterado e, para TS/TSX, executa somente testes
 * relacionados. Falhas viram contexto para o agente; o hook nao mascara nem
 * substitui o quality gate completo.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FORMAT_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const TESTABLE_EXTENSIONS = new Set(['.ts', '.tsx']);
const MAX_FEEDBACK_CHARS = 3500;

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

function findProjectRoot(startPath) {
  if (process.env.CLAUDE_PROJECT_DIR) return path.resolve(process.env.CLAUDE_PROJECT_DIR);

  let current = path.resolve(startPath || process.cwd());
  while (current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, 'package.json')) &&
      fs.existsSync(path.join(current, '.claude'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  return path.resolve(startPath || process.cwd());
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== '' &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== '..' &&
    !path.isAbsolute(relative)
  );
}

function resolvePackageBin(projectRoot, packageName, preferredBin) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [projectRoot] });
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const binEntry =
    typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin[preferredBin];
  return path.resolve(path.dirname(packageJsonPath), binEntry);
}

function runNodeCli(cliPath, args, projectRoot, timeout) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
    timeout,
    windowsHide: true,
  });
}

function commandFailure(label, result) {
  if (!result.error && result.status === 0) return null;
  const output = [result.stdout, result.stderr, result.error && result.error.message]
    .filter(Boolean)
    .join('\n')
    .trim();
  const tail = output.slice(-MAX_FEEDBACK_CHARS);
  return `${label} falhou. Corrija antes de concluir.${tail ? `\n${tail}` : ''}`;
}

function acquireTestLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.claude', 'tmp-related-test.lock');

  try {
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs > 60_000) fs.unlinkSync(lockPath);
  } catch (_) {
    // Ausencia do lock e o caso normal.
  }

  try {
    const descriptor = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(descriptor, `${process.pid}\n`, 'utf8');
    fs.closeSync(descriptor);
    return () => {
      try {
        fs.unlinkSync(lockPath);
      } catch (_) {
        // Outro processo pode ter removido um lock obsoleto.
      }
    };
  } catch (_) {
    return null;
  }
}

function emitFeedback(messages) {
  if (messages.length === 0) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[harness fast-feedback]\n${messages.join('\n\n')}`,
      },
    })
  );
}

readStdin()
  .then(rawInput => {
    let event;
    try {
      event = JSON.parse(rawInput || '{}');
    } catch (_) {
      process.exit(0);
      return;
    }

    if (event.tool_name !== 'Write' && event.tool_name !== 'Edit') process.exit(0);

    const projectRoot = findProjectRoot(event.cwd);
    const filePath = path.resolve(
      event.cwd || projectRoot,
      event.tool_input && event.tool_input.file_path
    );
    const sourceRoot = path.join(projectRoot, 'src');
    const extension = path.extname(filePath).toLowerCase();

    if (
      !fs.existsSync(filePath) ||
      !isInside(sourceRoot, filePath) ||
      !FORMAT_EXTENSIONS.has(extension)
    ) {
      process.exit(0);
    }

    const physicalFilePath = fs.realpathSync.native(filePath);
    const physicalSourceRoot = fs.realpathSync.native(sourceRoot);
    if (!isInside(physicalSourceRoot, physicalFilePath)) process.exit(0);

    const relativePath = path.relative(projectRoot, filePath).split(path.sep).join('/');
    const feedback = [];

    try {
      const prettierCli = resolvePackageBin(projectRoot, 'prettier', 'prettier');
      const formatResult = runNodeCli(prettierCli, ['--write', relativePath], projectRoot, 10_000);
      const formatFailure = commandFailure(`Prettier (${relativePath})`, formatResult);
      if (formatFailure) feedback.push(formatFailure);
    } catch (error) {
      if (fs.existsSync(path.join(projectRoot, 'node_modules'))) {
        feedback.push(
          `Prettier nao iniciou: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (TESTABLE_EXTENSIONS.has(extension) && !filePath.endsWith('.d.ts')) {
      const releaseLock = acquireTestLock(projectRoot);
      if (releaseLock) {
        try {
          const vitestCli = resolvePackageBin(projectRoot, 'vitest', 'vitest');
          const isTestFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(filePath);
          const testArgs = isTestFile
            ? [relativePath, '--run', '--passWithNoTests', '--reporter=dot', '--no-color']
            : [
                'related',
                relativePath,
                '--run',
                '--passWithNoTests',
                '--reporter=dot',
                '--no-color',
              ];
          const testResult = runNodeCli(vitestCli, testArgs, projectRoot, 25_000);
          const testFailure = commandFailure(`Vitest relacionado (${relativePath})`, testResult);
          if (testFailure) feedback.push(testFailure);
        } catch (error) {
          if (fs.existsSync(path.join(projectRoot, 'node_modules'))) {
            feedback.push(
              `Vitest relacionado nao iniciou: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } finally {
          releaseLock();
        }
      }
    }

    emitFeedback(feedback);
    process.exit(0);
  })
  .catch(() => process.exit(0));
