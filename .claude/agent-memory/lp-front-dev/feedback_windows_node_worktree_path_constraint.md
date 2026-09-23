---
name: feedback-windows-node-worktree-path-constraint
description: Rodar npm/tsc/vitest exige que o cwd esteja sob /mnt/c/... neste WSL — nunca crie worktrees em /tmp
metadata:
  type: feedback
---

Neste ambiente (WSL sem Node nativo instalado), só existe Node/npm via Windows
(`/mnt/c/Program Files/nodejs/`). Os wrappers `.cmd`/`.ps1` do npm (usados por `npx tsc`,
`npx eslint`, `npx vitest` etc.) invocam `cmd.exe`, que falha com "UNC paths are not
supported" quando o diretório de trabalho é um caminho puramente WSL (ex.: `/tmp/...`).
O sintoma é enganoso: o comando não dá erro, só imprime o texto de ajuda do `tsc` como se
nenhum argumento tivesse sido passado.

**Why:** perdi um worktree inteiro (`git worktree add /tmp/...`) e tive que redigitar
todas as edições porque descobri isso só depois de já ter feito as mudanças — o
`git worktree remove --force` para descartar o worktree quebrado apaga as mudanças não
commitadas junto.

**How to apply:** ao precisar isolar trabalho em paralelo (ex.: outro agente com WIP não
commitado na mesma branch), sempre crie o `git worktree add` como diretório IRMÃO do repo
principal em `/mnt/c/Users/.../source/repos/`, nunca em `/tmp` ou outro caminho só-WSL.
`npm ci` sozinho não expõe o problema (roda via node.exe direto); o problema aparece nos
scripts que dependem dos `.cmd` wrappers do npm (typecheck, lint, test, build).
