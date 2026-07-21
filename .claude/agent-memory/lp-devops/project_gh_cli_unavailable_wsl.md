---
name: gh-cli-unavailable-wsl-bash
description: gh CLI não existe neste ambiente (nem WSL nem Windows) — mas git/ssh via WSL interop (git.exe/ssh.exe) resolvem push/fetch normalmente com as credenciais do lado Windows
metadata:
  type: project
---

`gh` não está disponível **em lugar nenhum** deste ambiente — nem no bash/WSL nem no Windows.
Testado em 2026-07-20: `command -v gh`/`where.exe gh` → nada; busca por `gh.exe` em
`AppData/Local/Programs` e via `powershell.exe Get-Command gh` → nada. Não insista em `gh`,
não existe instalado.

**O problema real (e a solução) é mais específico — não é falta de credencial, é o shell
errado:** o `git` **nativo do WSL** (`/usr/bin/git` ou equivalente) não tem `~/.ssh`
(`/home/<user>/.ssh` não existe) — então `git fetch`/`git push` direto no bash falham com
`Host key verification failed` / `ssh_askpass: exec(/usr/bin/ssh-askpass): No such file or
directory`. As chaves do usuário **existem**, só que do lado Windows:
`/mnt/c/Users/<user>/.ssh/id_ed25519` (+ `known_hosts` já populado).

**Why:** o working directory deste repo é `/mnt/c/Users/.../LayoutParserReact` — ou seja, é o
mesmo filesystem/`.git` acessado tanto pelo Windows quanto pelo WSL (não são clones
separados), mas cada shell tem seu próprio `$HOME`/`~/.ssh`. O usuário só configurou SSH no
lado Windows (onde ele mesmo dá push manualmente às vezes).

**How to apply:** para qualquer operação de rede (`fetch`/`push`/`ls-remote`) a partir deste
agente, **não use o `git` do PATH do bash** — use os binários Windows via WSL interop, que
funcionam direto porque herdam o ambiente/credenciais do usuário:
```bash
git.exe fetch --all --prune     # em vez de `git fetch`
git.exe push -u origin <branch> # em vez de `git push`
git.exe ls-remote --heads origin
```
Confirmados disponíveis via interop: `git.exe`
(`/mnt/c/Users/<user>/AppData/Local/Programs/Git/cmd/git.exe`), `ssh.exe`
(`/mnt/c/Windows/System32/OpenSSH/ssh.exe`), `powershell.exe` (útil para `Get-Service`/checar
o runner). Continue usando o `git` nativo do bash para tudo **local** (log/status/diff/show/
branch/merge-base) — só troque para `git.exe` no momento de tocar a rede. Ver também
[[project_ci_validation_via_runner_diag_logs]] para como validar o resultado de um CI sem
`gh` nenhum.
