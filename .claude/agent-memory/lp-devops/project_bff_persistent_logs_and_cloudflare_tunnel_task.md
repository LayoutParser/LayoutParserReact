---
name: project_bff_persistent_logs_and_cloudflare_tunnel_task
description: BFF launcher now logs to a persistent file; Cloudflare Quick Tunnel got its own idempotent Scheduled Task SCRIPT — written but NOT yet run on the production host (see 2026-08-22 correction below).
metadata:
  type: project
---

**CORREÇÃO (2026-08-22):** evidência coletada pelo usuário no host de produção mostrou que a
Scheduled Task `Cloudflared-QuickTunnel` **nunca foi registrada de fato**. `Get-ScheduledTask`
só retorna `LayoutParserFrontend-BFF`; `Get-Process -Name cloudflared` está vazio;
`cloudflared-tunnel.log` não existe em lugar nenhum de `C:\`. O binário
`C:\Program Files (x86)\cloudflared\cloudflared.exe` está instalado. Ou seja: o texto abaixo
descreve corretamente o _script_ (`scripts/Register-CloudflareTunnel.ps1`, revisado de novo em
2026-08-19, ver [[project_virtualbox_autostart_task_and_login_flakiness_investigation]]), mas a
frase "registers ... as its own Scheduled Task" describe a intenção do script, não um fato já
aplicado em produção. A URL pública que ficou cadastrada como redirect URI no Entra
(`inspections-martha-excel-capability.trycloudflare.com`) veio de uma execução manual e
interativa de `cloudflared tunnel --url ...` em algum momento passado — quando essa sessão
fechou, o processo morreu e nunca voltou, o que explica o login quebrado relatado pelo usuário.
Antes de reusar qualquer afirmação deste arquivo como "já está em produção", confirme com
`Get-ScheduledTask -TaskName Cloudflared-QuickTunnel` no host.

Implemented on branch `feat/bff-logs-and-persistent-tunnel` (from `origin/develop`),
2026-08-15.

**BFF logs (Task 1):** `scripts/Deploy-Iis.ps1` now creates a persistent `logs/` directory
sibling to `runtime/`/`state/` under `$DeployRoot` (survives release rotation, unlike the
versioned `releases/<name>/` folder). `Start-Bff.ps1` no longer runs Node with a bare `&`
(which drops stdout/stderr under a non-interactive Scheduled Task). It now shells out via
`cmd.exe /c "... >> "logs\bff.log" 2>&1"` — verified with a standalone pwsh repro that the
generated redirection line is syntactically correct cmd.exe redirection, and this survives
without a console (unlike some PowerShell-native redirection tricks). Includes basic rotation:
truncates to a single `.old` backup once `bff.log` exceeds 20 MiB; multi-file rotation left as
a documented TODO comment in the generated launcher.

**Cloudflare Quick Tunnel (Task 2):** new standalone `scripts/Register-CloudflareTunnel.ps1`
(not auto-invoked by normal deploys) registers `cloudflared.exe tunnel --url https://127.0.0.1:443
...` as its own Scheduled Task (`Cloudflared-QuickTunnel` by default), independent from the
`$SiteName-BFF` task, with `RestartCount 999` and its own persistent log
(`logs/cloudflared-tunnel.log`, same rotation pattern). It is idempotent by default — running
again with an existing task is a no-op unless `-Force` is passed (which intentionally issues a
_new_ public URL, since Quick Tunnel URLs aren't stable across cloudflared restarts). After
starting the task it greps the log for the `*.trycloudflare.com` URL and prints it.
`Deploy-Iis.ps1` gained an optional `-EnableCloudflareTunnel` switch that calls this script
without `-Force` — so normal deploys never touch it unless explicitly opted in.

**Why:** debugging OIDC login on 2026-08-14 required repeatedly killing the managed Scheduled
Task and running the launcher interactively just to see pino/Fastify logs, and the Cloudflare
tunnel used for a public HTTPS origin (Google OAuth requires a real hostname, not a bare IP)
only survived as long as someone kept a PowerShell window open manually.

**How to apply:** this is explicitly a temporary/internal-validation setup (see comments in
`Register-CloudflareTunnel.ps1`) — no domain purchased yet, Quick Tunnel is free-tier. When a
real domain + Named Tunnel exists, this script becomes obsolete. `cloudflared.exe` is assumed
already installed at `C:\Program Files (x86)\cloudflared\cloudflared.exe` on the prod host (per
[[project_cloudflare_quick_tunnel_google_oauth_plan]]) — the script fails fast with a clear
message if the binary is missing there or at a custom `-CloudflaredPath`.
