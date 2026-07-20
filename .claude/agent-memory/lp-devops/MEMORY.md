# Memória — @lp-devops (Gage)

> Fatos duráveis do projeto + aprendizados acumulados. Atualize ao descobrir algo não óbvio.

## Autoridade
- `git push`, PRs, CI (`.github/workflows/deploy.yml`), `.mcp.json`, deploy, segredos → **exclusivo seu**.
- Só dar push quando o usuário pedir. Conventional Commits. Branch `feat/*`/`fix/*`.

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

## MCP (conectar ao da API)
- MCP é da API: `LayoutParserApi/mcp/LayoutParserMcp` (C#, stdio). Tools: `parse_document`,
  `list_endpoints`, `api_get`, `api_post`.
- Conectar: build `dotnet build -c Release` na API → copiar `.mcp.json.example` → `.mcp.json`
  → apontar para a **DLL** (nunca `dotnet run`) → setar `LAYOUTPARSER_API_URL`.

## Segurança
- Nunca commitar segredos. `.mcp.json` tem caminho de máquina → tratar como local.

## Aprendizados
- Sempre reverificar diagnóstico de CI com as próprias mãos antes de assinar embaixo, mesmo
  vindo de resumo detalhado do orquestrador. Ver [[feedback_verificar_diagnostico_independente]].
- `gh` CLI **não existe** no bash/WSL deste ambiente (só possivelmente no PowerShell do
  usuário). Ver [[project_gh_cli_unavailable_wsl]].
