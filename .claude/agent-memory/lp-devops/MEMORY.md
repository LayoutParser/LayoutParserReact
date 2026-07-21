# Memória — @lp-devops (Gage)

> Fatos duráveis do projeto + aprendizados acumulados. Atualize ao descobrir algo não óbvio.

## Autoridade
- `git push`, PRs, CI (`.github/workflows/deploy.yml`), `.mcp.json`, deploy, segredos → **exclusivo seu**.
- Só dar push quando o usuário pedir. Conventional Commits. Branch `feat/*`/`fix/*`.
- **`git`/`ssh` de rede (fetch/push) não funcionam no bash/WSL puro** (sem `~/.ssh`) — use
  `git.exe`/`ssh.exe` via interop, que já têm as credenciais do usuário. `git` normal do bash
  serve para tudo local (log/status/diff). Ver [[project_gh_cli_unavailable_wsl]].

## Build & deploy
- `npm run build` → `tsc && vite build` → `dist/`. Artefatos SPA: `public/web.config` (IIS),
  `.htaccess` (Apache), `public/_redirects` (static).
- Dev: porta 3000, proxy `/api` → `http://172.25.32.42:5000` (ajustável).
- Base URL da API: `VITE_API_BASE_URL` ou por hostname (172.25.32.42 / localhost = :5000).
- **Dois pipelines isolados** desde commit `7d24128`: `ci-dev.yml` (push `develop`/`feat/**`,
  runner `dev-local`, `npm run build` com `tsc` estrito, sem deploy) x `deploy.yml` (push
  `main`/`master`, runner `production`, `npm run build:prod` **sem `tsc`**, com robocopy pro
  IIS). Falha de `tsc` no CI de dev **não** é risco de produção. Detalhe:
  [[project_ci_dev_dual_pipeline]].

## Máquina de dev (NDD-NOT-10910)
- Windows 11 Enterprise LTSC, IIS instalado e rodando (porta 80, Default Web Site). Já existe
  `C:\inetpub\wwwroot\layoutparser\` (API dev do back-end vive lá — serviço Windows nativo na
  porta 5100, não IIS). Runner roda como `LocalSystem` (mais privilégio que meu contexto
  interativo, que não é admin). Detalhe completo, portas ocupadas, e o que confirmei via HTTP:
  [[project_dev_machine_iis_topology]].
- **Front de dev servido de verdade (em andamento):** decisão do usuário foi site IIS
  DEDICADO (não reaproveitar o Default Web Site) — porta `8081` (confirmei livre), raiz
  `C:\inetpub\layoutparser-front-dev\`. `ci-dev.yml` já editado com steps de auto-provisionamento
  idempotente + deploy (só em push `develop`), **ainda não commitado/pushado** — falta criar
  as Variables `DEPLOY_PATH_DEV_FRONTEND`/`FRONTEND_DEV_PORT`/`API_URL_DEV` no GitHub antes do
  primeiro push funcionar. Detalhe: [[project_dev_machine_iis_topology]] (seção "Decisão final").

## MCP (conectar ao da API)
- MCP é da API: `LayoutParserApi/mcp/LayoutParserMcp` (C#, stdio). Tools: `parse_document`,
  `list_endpoints`, `api_get`, `api_post`.
- Conectar: build `dotnet build -c Release` na API → copiar `.mcp.json.example` → `.mcp.json`
  → apontar para a **DLL** (nunca `dotnet run`) → setar `LAYOUTPARSER_API_URL`.

## Segurança
- Nunca commitar segredos. `.mcp.json` tem caminho de máquina → tratar como local.

## Aprendizados
- Esbarrou em parede de permissão/elevação investigando infra (IIS, serviços)? Para e reporta
  — não procura outro caminho/interop pra contornar. Ver [[feedback_parar_em_parede_de_permissao]].
- Sempre reverificar diagnóstico de CI com as próprias mãos antes de assinar embaixo, mesmo
  vindo de resumo detalhado do orquestrador. Ver [[feedback_verificar_diagnostico_independente]].
- `gh` CLI **não existe em lugar nenhum** deste ambiente (nem WSL, nem Windows) — mas
  `git.exe`/`ssh.exe` via interop resolvem push/fetch. Ver [[project_gh_cli_unavailable_wsl]].
- Runner de dev (`NDD-NOT-10910`) roda **nesta máquina** como serviço Windows — dá pra validar
  resultado de CI lendo `_diag/Runner_*.log`/`Worker_*.log` direto, sem `gh`/API. Ver
  [[project_ci_validation_via_runner_diag_logs]].
- Antes de agir sobre estado remoto (branch/push), sempre `fetch` de verdade (via `git.exe`) —
  refs em cache (`origin/main` etc.) podem estar bem atrasadas se o usuário commitou/deu
  merge por fora nesse meio-tempo.
