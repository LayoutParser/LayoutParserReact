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

## MCP (conectar ao da API)
- MCP é da API: `LayoutParserApi/mcp/LayoutParserMcp` (C#, stdio). Tools: `parse_document`,
  `list_endpoints`, `api_get`, `api_post`.
- Conectar: build `dotnet build -c Release` na API → copiar `.mcp.json.example` → `.mcp.json`
  → apontar para a **DLL** (nunca `dotnet run`) → setar `LAYOUTPARSER_API_URL`.

## Segurança
- Nunca commitar segredos. `.mcp.json` tem caminho de máquina → tratar como local.

## Aprendizados
- (adicione aqui: detalhes do deploy real, credenciais a externalizar, etc.)
