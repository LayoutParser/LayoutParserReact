---
name: project-197-analysis-history-gate
description: Validação de gates do #197 (histórico de análises fiscais) em origin/develop, commit 09c3dad, antes de Done
metadata:
  type: project
---

Rodei os gates do PR #286 (feat/analysis-history-archive) em worktree separado sobre `origin/develop`
(commit `09c3dad`), pois esse código não existe na branch de trabalho atual
(`feat/mapping-studio-rule-detail-panel`).

Resultado: lint limpo, `tsc --noEmit` limpo, 14/14 testes (`AnalysisArchive.test.tsx` +
`analysisHistoryService.test.ts`) passando, `contract:check` OK (47/47, 5 propostos — condizente
com endpoints ainda não em produção). Não achei filtro por tipo fiscal nem fluxo de "reabertura"
com proveniência no componente `AnalysisArchive.tsx` (grep por `reabr|reopen|fiscalType|filtro`
sem resultado) — confirma o gap que o `@lp-product-manager` já havia relatado no issue.

**Why:** repo Windows-nativo (`npm`/`node` via .exe) não enxerga `/tmp` do WSL; worktrees para
validar branches/commits fora da working branch atual precisam ficar em caminho visível ao
Windows (ex.: `/mnt/c/Users/<user>/AppData/Local/Temp/...`), não em `/tmp`. Ver [[project_env_node_windows_paths]].

**How to apply:** ao validar um commit/branch diferente da branch ativa sem fazer checkout
destrutivo, usar `git worktree add <caminho-em-/mnt/c/...>` em vez de `/tmp`, rodar `npm ci`
ali, e depois `git worktree remove --force` para limpar.
