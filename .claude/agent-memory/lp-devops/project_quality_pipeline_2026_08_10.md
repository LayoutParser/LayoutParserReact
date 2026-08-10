# Pipeline de quality gates — 2026-08-10

- `.github/workflows/quality.yml` executa `npm ci` + `npm run quality` em PRs para
  develop/main/master e pushes `codex/**`/`fix/**`, com permissão somente de leitura.
- `ci-dev.yml` e `deploy.yml` também exigem o gate completo antes de publicar; ambos usam o
  lockfile e cache npm. O deploy de dev mantém um build production extra apenas para injetar
  `VITE_API_BASE_URL` do ambiente.
- Requisito do runtime: Node 20.19+ ou 22.12+; os workflows usam o patch mais recente de 20.x.
- Altas/críticas de dependências bloqueiam o pipeline. As 2 moderadas do Router 6 estão
  documentadas para migração separada.
