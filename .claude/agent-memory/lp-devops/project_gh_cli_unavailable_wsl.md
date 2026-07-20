---
name: gh-cli-unavailable-wsl-bash
description: gh CLI não está instalado/no PATH do shell bash (WSL) usado por este agente — comandos gh (pr list/create/merge/comment) falham com "command not found"
metadata:
  type: project
---

`gh` não está disponível no bash/WSL que este agente usa por padrão neste working directory
(`/mnt/c/Users/elson.lopes/source/repos/LayoutParserReact`). Testado em 2026-07-20:
`command -v gh` → exit 1; `where.exe gh` → "Could not find files for the given pattern(s)".

**Why:** o ambiente principal do usuário é PowerShell no Windows (ver
`.claude/CLAUDE.md` §7, "Shell primário: PowerShell"); `gh` provavelmente só está
instalado/autenticado lá, não neste shell bash.

**How to apply:** antes de tentar `gh pr list/create/merge/comment` a partir deste bash, ter
em mente que provavelmente vai falhar. Se precisar checar/mexer em PR e o comando falhar, não
concluir "não existe PR" — sinalizar ao usuário/orquestrador que a verificação via `gh` não
pôde ser feita a partir deste shell e sugerir rodar do PowerShell (onde a autoridade de
push/PR também é exercida), ou pedir para o usuário confirmar via GitHub web.
