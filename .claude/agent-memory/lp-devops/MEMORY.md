# Memória — @lp-devops (Gage)

- Push, PR, CI, deploy, secrets e MCP são autoridade exclusiva de `@lp-devops`.
- [Pipeline seguro](project_quality_pipeline_2026_08_10.md) — runners isolados, Actions por SHA e releases IIS+BFF.
- [GitHub CLI](project_gh_cli_unavailable_wsl.md) — `gh` não estava instalado; revalidar antes de assumir.
- [Node no Windows](project_node_toolchain_wsl_interop.md) — validar env vars no shell nativo correto.
- [Parede de permissão](feedback_parar_em_parede_de_permissao.md) — não contornar elevação ou credenciais.
- [Verificação independente](feedback_verificar_diagnostico_independente.md) — reproduzir a evidência-chave.

Arquitetura vigente: front same-origin; IIS HTTPS/Windows Auth → BFF Node em loopback → API
.NET. `Deploy-Iis.ps1` publica releases versionadas, mantém rollback e falha sem ARR, Rewrite,
site HTTPS, allowlist ou configuração segura. Não versionar paths pessoais, IPs, tokens ou
payloads. O MCP continua pertencendo à API e este repo só mantém o exemplo de conexão.
