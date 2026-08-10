# Pipeline seguro — 2026-08-10

- `quality.yml` roda em GitHub-hosted runner: front+BFF, contrato, build/artifact, auditoria
  moderada e E2E Playwright desktop/mobile.
- `ci-dev.yml` aceita somente `develop` no runner `dev-local`; `deploy.yml` aceita somente
  `main` no runner `production`. Ambos usam environments isolados.
- Checkout/setup-node e demais Actions estão fixados por SHA, token read-only e credenciais do
  checkout não persistem.
- Deploy publica releases versionadas com `Deploy-Iis.ps1`, reinicia BFF em Scheduled Task,
  valida health/HTTPS e restaura a release anterior se o smoke falhar.
- O site IIS deve existir. Em desenvolvimento, `Install-IisArr.ps1` instala ARR 3 após validar
  assinatura Microsoft e SHA-256, e `Initialize-IisDevHttps.ps1` migra o binding para HTTPS usando
  o certificado local compatível com `PUBLIC_HOST_DEV`; ambos são idempotentes. Produção continua
  totalmente pré-provisionada. O deploy exige URL Rewrite, autenticação Windows, allowed server
  variable, allowlist e BFF em loopback.
- O bootstrap dev confia automaticamente apenas no certificado autoassinado já validado para
  `PUBLIC_HOST_DEV`. Ambos os workflows forçam checkout LF via configuração Git efêmera do job;
  produção também regrava e verifica o workspace após o checkout.
- Scripts que usam o provider `IIS:\` rodam em `powershell.exe`; o PowerShell 7 pode carregar
  `WebAdministration` via compatibilidade sem expor esse drive ao processo chamador.
- O runtime Node do BFF usa nome content-addressed por SHA-256 para nunca sobrescrever um
  `node.exe` ainda aberto pela release anterior.
- Dependabot, dependency review, CodeQL e CODEOWNERS fazem parte da supply chain.
