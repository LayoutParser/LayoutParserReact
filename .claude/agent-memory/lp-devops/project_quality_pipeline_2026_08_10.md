# Pipeline seguro — 2026-08-10

- `quality.yml` roda em GitHub-hosted runner: front+BFF, contrato, build/artifact, auditoria
  moderada e E2E Playwright desktop/mobile.
- `ci-dev.yml` aceita somente `develop` no runner `dev-local`; `deploy.yml` aceita somente
  `main` no runner `production`. Ambos usam environments isolados.
- Checkout/setup-node e demais Actions estão fixados por SHA, token read-only e credenciais do
  checkout não persistem.
- Deploy publica releases versionadas com `Deploy-Iis.ps1`, reinicia BFF em Scheduled Task,
  valida health/HTTPS e restaura a release anterior se o smoke falhar.
- IIS deve ser pré-provisionado com site/binding HTTPS. Em desenvolvimento,
  `Install-IisArr.ps1` instala ARR 3 de forma idempotente após validar assinatura Microsoft e
  SHA-256; produção continua pré-provisionada. O deploy exige URL Rewrite, autenticação Windows,
  allowed server variable, allowlist e BFF em loopback.
- Dependabot, dependency review, CodeQL e CODEOWNERS fazem parte da supply chain.
