---
description: Matriz de autoridade e delegação entre os agentes do LayoutParser React.
---

# Agent Authority — LayoutParser React

## Matriz de delegação

### @lp-devops (Gage) — Autoridade EXCLUSIVA

| Operação                                                       | Exclusivo? | Outros agentes |
| -------------------------------------------------------------- | ---------- | -------------- |
| `git push` / `git push --force`                                | SIM        | BLOQUEADO      |
| `gh pr create` / `gh pr merge`                                 | SIM        | BLOQUEADO      |
| Editar `.github/workflows/`, deploy, `vite.config.ts` (deploy) | SIM        | BLOQUEADO      |
| Conectar/configurar MCP (`.mcp.json`)                          | SIM        | BLOQUEADO      |
| Variáveis de ambiente / segredos                               | SIM        | BLOQUEADO      |

### @lp-front-dev (Remy) — Implementação

| Permitido                                                 | Bloqueado                                   |
| --------------------------------------------------------- | ------------------------------------------- |
| `git add`, `git commit`, `git status`, `git diff` (local) | `git push` → `@lp-devops`                   |
| Criar/editar componentes, stores, services, types, rotas  | `gh pr create/merge` → `@lp-devops`         |
| Branch/checkout/merge local                               | Editar CI/`.mcp.json`/deploy → `@lp-devops` |

### @lp-ui-ux (Nina) — Interface

| Possui                                     | Não possui                                              |
| ------------------------------------------ | ------------------------------------------------------- |
| Componentes, CSS, acessibilidade, fluxo UX | Lógica de dados/`services` → `@lp-front-dev` · git push |

### @lp-qa (Quinn) — Qualidade

| Possui                                                        | Não possui                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| Quality gates, validação de fluxo, testes, veredito PASS/FAIL | Implementar a correção de produção (devolve a dev) · git push |

### @lp-security (Iris) — Segurança read-only

| Possui                                                                                 | Não possui                                                                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Auditoria de diff/repo, threat model, advisories, evidência P0-P3, veredito PASS/BLOCK | Editar produção/dependências/CI/MCP/segredos · aceitar risco pelo usuário · git push |

- Pode executar diagnósticos e consultar fontes oficiais atuais.
- Segredo encontrado: informa apenas **caminho e tipo**, nunca o valor.
- Correção de app/dependência → `@lp-front-dev`; transporte, headers, CI, deploy e segredos →
  `@lp-devops`; contrato/autorização da API → equipe da API.

### @lp-contract-qa (Cora) — Contrato read-only

| Possui                                                                                                     | Não possui                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Comparar API ↔ types/services/consumidores, usar MCP já conectado em leitura, emitir PASS/DRIFT/UNVERIFIED | Inventar/editar contrato, configurar MCP, executar POST com dado real, corrigir produção · git push |

- Fonte da verdade: MCP da API já conectado; fallback em OpenAPI/controllers/DTOs da API.
- Drift no front → `@lp-front-dev`; drift na fonte → equipe da API; revalidação antes de
  `@lp-qa`/`@lp-doc`.

### @lp-doc (Duda) — Documentação

| Possui                                             | Não possui                    |
| -------------------------------------------------- | ----------------------------- |
| README, comentários, material acadêmico (bilíngue) | Código de produção · git push |

## Fluxos de delegação

```
Feature:   @lp-front-dev (implementa) → @lp-ui-ux (refina UI) → @lp-qa (valida)
           → @lp-doc (documenta) → @lp-devops (push)

Contrato:  @lp-contract-qa (detecta drift) → @lp-front-dev/equipe API (corrige)
           → @lp-contract-qa (revalida) → @lp-qa

Segurança: @lp-security (audita) → agente dono (corrige) → @lp-security (revalida)
           → @lp-qa

Git push:  QUALQUER agente → @lp-devops
MCP:       QUALQUER agente precisa → @lp-devops conecta
Segredo:   QUALQUER agente detecta → BLOQUEIA commit → @lp-devops
```

## Escalonamento

1. Agente não consegue concluir → escalar ao usuário com contexto (handoff).
2. Quality gate falha → retorna ao dev com feedback específico.
3. Segredo/credencial em texto plano detectado → BLOQUEIA commit, aciona `@lp-devops`.
4. Segurança `BLOCK` ou contrato `DRIFT` → não concluir até correção ou aceite explícito do
   usuário (risco aceito nunca é decisão do agente).
