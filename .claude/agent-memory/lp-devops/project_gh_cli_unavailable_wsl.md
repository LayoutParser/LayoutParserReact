---
name: gh-cli-and-git-network-ops-wsl
description: gh CLI e git push do bash/WSL FUNCIONAM neste ambiente desde 2026-08-15 (remote HTTPS + token gh) — corrige a nota antiga de que gh não existia e exigia git.exe
metadata:
  type: project
---

**Estado atual (confirmado em 2026-08-15):** operações de rede do git e o `gh` funcionam
direto do bash/WSL, sem interop.

- `gh` **está instalado** no WSL (`gh version 2.45.0`) e autenticado como
  `elson-vinicius-lopes`, protocolo HTTPS, escopos `gist`, `project`, `read:org`, `repo`,
  `workflow`. `gh pr create`/`view` funcionam (usado para abrir a PR #111).
- O `origin` deste repo é **HTTPS** (`https://github.com/LayoutParser/LayoutParserReact.git`),
  não SSH. `git fetch`/`git push` nativos do bash funcionam usando a credencial do `gh` —
  não é mais necessário `git.exe`.

**Why:** a versão anterior desta memória (2026-07-20) afirmava que `gh` não existia em lugar
nenhum e que `git fetch`/`push` do bash falhavam com `Host key verification failed`, exigindo
`git.exe`/`ssh.exe` via interop. Aquilo era verdade quando o `origin` era SSH e as chaves só
existiam do lado Windows (`/mnt/c/Users/<user>/.ssh`), com `$HOME` do WSL sem `~/.ssh`. O
remote migrou para HTTPS e o `gh` foi instalado desde então, o que dissolveu os dois problemas
de uma vez. Guardo o histórico porque explica por que outras memórias ainda citam `git.exe`.

**How to apply:** use `git` e `gh` nativos do bash normalmente. Só investigue interop se
aparecer erro de credencial/host key — e, nesse caso, **revalide** (`gh auth status`,
`git remote -v`) antes de concluir qualquer coisa: este ambiente já mudou uma vez. A restrição
que continua valendo não é técnica e sim de autoridade: push/PR/merge só com pedido explícito
do usuário, e nunca contornando uma parede de permissão — ver
[[feedback_parar_em_parede_de_permissao]]. O `npm`/`node` continuam sendo binários **Windows**
alcançados por interop, com `WSLENV` vazio — esse ponto **não** mudou, ver
[[project_node_toolchain_wsl_interop]].
