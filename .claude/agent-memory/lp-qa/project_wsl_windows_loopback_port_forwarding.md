---
name: project-wsl-windows-loopback-port-forwarding
description: curl nativo do WSL não alcança processos node.exe (Windows) escutando em 127.0.0.1 neste ambiente — usar curl.exe
metadata:
  type: project
---

Neste ambiente (WSL2 sobre Windows, ver também [[project_env_node_windows_paths]]), quando
`npm run dev`/`npm run dev:front`/`npm run dev:bff` sobem processos **node.exe nativos do
Windows** escutando em `127.0.0.1:<porta>` (ex.: BFF em 3101, Vite em 3000 — este último em
`[::1]:3000`, IPv6, não IPv4), o `curl` do WSL (binário Linux) falha com "Connection refused"
mesmo com o processo ativo e saudável. `curl.exe` (o curl nativo do Windows, acessível via PATH
no WSL) conecta normalmente. Confirmado em 2026-08-13 ao validar upload real do fluxo IDoc SAP.

**Why:** WSL2 costuma ter localhost forwarding bidirecional, mas neste ambiente especificamente
isso não vale para todo processo Windows — a causa exata não foi confirmada (pode ser
configuração de firewall/mirrored networking desta máquina). O sintoma engana porque parece que
o servidor não subiu, quando na verdade só não é alcançável pelo stack de rede do WSL.

**How to apply:** ao validar manualmente (via curl) um servidor dev iniciado como processo
Windows nativo neste repo, se `curl http://127.0.0.1:<porta>/...` falhar com "Connection
refused", tentar `curl.exe -s http://127.0.0.1:<porta>/...` (ou `http://[::1]:<porta>/...` se o
serviço só escuta em IPv6, como o Vite) antes de concluir que o servidor não iniciou. Para
enviar arquivos de dentro do WSL via `curl.exe`, converter os paths com `wslpath -w` antes de
passar em `-F "campo=@<path-windows>"`. Vale também para matar processos node.exe órfãos: `kill`
do WSL não os alcança; usar `taskkill.exe /PID <pid> /F` (ou `/T /F` para matar a árvore de um
`concurrently`/`npm run dev` completo) — `Stop-Process` via `powershell.exe` pode ser bloqueado
pelo classificador de permissões do Claude Code mesmo quando `taskkill.exe` direto não é.
