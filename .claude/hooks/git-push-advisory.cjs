#!/usr/bin/env node
/**
 * git-push-advisory — hook PreToolUse NAO-BLOQUEANTE.
 *
 * Lembra que `git push` (e abrir/mergear PR) e responsabilidade EXCLUSIVA do
 * agente @lp-devops (ver .claude/rules/agent-authority.md). NUNCA bloqueia:
 * apenas escreve um lembrete em stderr e sai com codigo 0.
 */
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const evt = JSON.parse(input || '{}');
    const cmd = (evt && evt.tool_input && evt.tool_input.command) || '';
    if (/\bgit\s+push\b/.test(cmd) || /\bgh\s+pr\s+(create|merge)\b/.test(cmd)) {
      process.stderr.write(
        '\n[harness] Lembrete: git push / PR e EXCLUSIVO do @lp-devops (Gage).' +
        ' Veja .claude/rules/agent-authority.md.\n'
      );
    }
  } catch (_) {
    /* nao-bloqueante: qualquer erro de parse e ignorado */
  }
  process.exit(0);
});
