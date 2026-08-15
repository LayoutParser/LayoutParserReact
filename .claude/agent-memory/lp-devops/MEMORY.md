# Memória — @lp-devops (Gage)

- Push, PR, CI, deploy, secrets e MCP são autoridade exclusiva de `@lp-devops`.
- [Pipeline seguro](project_quality_pipeline_2026_08_10.md) — runners isolados, Actions por SHA e releases IIS+BFF.
- [gh CLI e git de rede](project_gh_cli_unavailable_wsl.md) — hoje funcionam direto do bash/WSL (remote HTTPS + gh 2.45); nota antiga do `git.exe` está superada.
- [Node no Windows](project_node_toolchain_wsl_interop.md) — validar env vars no shell nativo correto.
- [Parede de permissão](feedback_parar_em_parede_de_permissao.md) — não contornar elevação ou credenciais.
- [Verificação independente](feedback_verificar_diagnostico_independente.md) — reproduzir a evidência-chave.
- [Dependabot](project_dependabot_compatibility_policy.md) — agrupar pares e migrar majors manualmente.
- [CodeQL/dependency-review sempre vermelhos](project_codeql_dependency_review_need_ghas.md) — falta GHAS no repo privado; falha pré-existente, não regressão.
- [Páginas legais com placeholder](project_legal_pages_placeholders_pending.md) — `/terms` e `/privacy` esperam e-mail/jurisdição da empresa; não preencher sozinho.
- [.env do BFF é fail-fast](project_bff_env_failfast_placeholders.md) — placeholder no valor aborta o boot; use comentário e chave vazia.

Arquitetura vigente: front same-origin; IIS HTTPS anônimo encaminha `/auth` e `/api` → BFF Node
em loopback com Entra OIDC/sessão criptografada → API .NET. `Deploy-Iis.ps1` desabilita Windows
Auth, publica releases versionadas, mantém rollback e falha sem ARR, Rewrite, Entra, site HTTPS,
allowlist ou configuração segura. `ENTRA_CLIENT_SECRET` existe somente como environment secret;
o launcher local que o recebe fica restrito a SYSTEM/Administradores. Não versionar secrets,
paths pessoais, IPs, tokens ou payloads. O MCP continua pertencendo à API.
