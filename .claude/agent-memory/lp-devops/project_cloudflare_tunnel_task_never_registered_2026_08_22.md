---
name: project_cloudflare_tunnel_task_never_registered_2026_08_22
description: Evidência de 2026-08-22 confirmando que a Scheduled Task Cloudflared-QuickTunnel nunca foi registrada em produção, apesar de memórias anteriores sugerirem o contrário.
metadata:
  type: project
---

Evidência coletada pelo usuário via PowerShell no host de produção, em 2026-08-22:

- `Get-ScheduledTask | Where-Object { $_.TaskName -match 'loud|unnel|BFF' }` só retorna
  `LayoutParserFrontend-BFF` (Running). Nenhuma task `Cloudflared-QuickTunnel`.
- `Get-Process -Name cloudflared` vazio — nenhum `cloudflared.exe` rodando.
- `Test-Path 'C:\Program Files (x86)\cloudflared\cloudflared.exe'` = True — binário instalado.
- Busca recursiva em `C:\` por `cloudflared-tunnel.log` não encontrou nada.

**Conclusão:** o script `scripts/Register-CloudflareTunnel.ps1` sempre esteve correto (revisado
em 2026-08-15 e novamente em 2026-08-19), mas nunca foi de fato executado/registrado no host de
produção. A URL pública cadastrada como redirect URI no Entra
(`inspections-martha-excel-capability.trycloudflare.com`) veio de uma execução manual e
interativa de `cloudflared tunnel --url ...` em algum momento passado; quando a sessão
interativa fechou, o processo cloudflared morreu e nunca voltou — o que explica o login
quebrado relatado pelo usuário (o BFF em si segue de pé via `LayoutParserFrontend-BFF`, só o
túnel público caiu).

**Por que:** memórias anteriores ([[project_bff_persistent_logs_and_cloudflare_tunnel_task]],
[[project_virtualbox_autostart_task_and_login_flakiness_investigation]]) descreviam a
implementação do _script_ em termos que soavam como "já registrado em produção" — eram
descrições da lógica do script, não confirmação de execução real no host. Já foram corrigidas
com uma nota apontando para este arquivo.

**Como aplicar:** antes de tratar a Cloudflare Quick Tunnel como ativa em produção, sempre
confirme com `Get-ScheduledTask -TaskName Cloudflared-QuickTunnel` no host — nunca assuma pela
memória. Registrar a task exige `-DeployRoot` (mesmo valor do secret `DEPLOY_PATH` usado por
`Deploy-Iis.ps1` via `.github/workflows/deploy.yml`) e, opcionalmente, `-PublicHost` (mesmo
valor da variável `PUBLIC_HOST`, usada para SNI/host-header do túnel — combina com o binding
HTTPS do site IIS, não é o hostname `*.trycloudflare.com`). Nenhum desses dois valores está
hardcoded neste repo; pergunte ao usuário ou leia os secrets/vars do environment `production`
no GitHub antes de montar o comando de registro. Execução é ação de produção — precisa
aprovação explícita do usuário, nunca automática.

**Atualização 2026-08-22 (mesmo dia, após registro bem-sucedido):** a task foi registrada com
sucesso neste host (BRNDDAPPBLD01) com o fix `--edge-ip-version 4` (IPv6 travava o POST inicial
de "Requesting new quick Tunnel"; ver [[project_cloudflare_tunnel_url_extraction_regex_bug]]
para o bug de extração de URL encontrado logo em seguida, na mesma sessão de deploy).
