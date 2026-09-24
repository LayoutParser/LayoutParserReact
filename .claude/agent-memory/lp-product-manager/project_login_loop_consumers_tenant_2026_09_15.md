---
name: project-login-loop-consumers-tenant-2026-09-15
description: Bug #253 — loop de login em produção para contas pessoais Microsoft, dependência cross-repo bloqueada na API .NET
metadata:
  type: project
---

Issue #253 criada (`[BUG] Login com conta pessoal Microsoft trava em loop — API não resolve
identidade do tenant "consumers"`), labels `type: bug`, `priority: p1`, `area: integration`,
`area: bff`, `blocked`. Adicionada ao Project #3 com Status `Blocked`.

**Why:** Investigação técnica (sessão 2026-09-15, ver memória de `@lp-devops`
`project_login_loop_setcookie_investigation_2026_09_15.md`) confirmou que front e BFF deste
repositório estão corretos — cookie de sessão funciona, headers de identidade são encaminhados
corretamente. A API .NET (LayoutParserApi, outro repositório) responde 401
`"Identidade não resolvida."` para contas pessoais Microsoft (tenant "consumers", GUID
`9188040d-6c67-4c5b-b112-36a304b66dad`), causando o loop de login em produção. Nenhum agente
deste repo pode corrigir — dependência cross-repo explícita, conforme
[[product-governance]].

**How to apply:** Não fechar #253 até que LayoutParserApi resolva/provisiona identidade do
tenant "consumers" (ou produto decida explicitamente não suportar contas pessoais). Ao
sincronizar (`/product-sync`), verificar se há PR/issue correspondente no repositório
LayoutParserApi antes de mudar o status.
