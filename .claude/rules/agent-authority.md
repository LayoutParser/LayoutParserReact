---
description: Matriz de autoridade e delegação entre os agentes do LayoutParser React.
---

# Agent Authority — LayoutParser React

## Matriz de delegação

### @lp-devops (Gage) — Autoridade EXCLUSIVA

| Operação | Exclusivo? | Outros agentes |
|----------|-----------|----------------|
| `git push` / `git push --force` | SIM | BLOQUEADO |
| `gh pr create` / `gh pr merge` | SIM | BLOQUEADO |
| Editar `.github/workflows/`, deploy, `vite.config.ts` (deploy) | SIM | BLOQUEADO |
| Conectar/configurar MCP (`.mcp.json`) | SIM | BLOQUEADO |
| Variáveis de ambiente / segredos | SIM | BLOQUEADO |

### @lp-front-dev (Remy) — Implementação

| Permitido | Bloqueado |
|-----------|-----------|
| `git add`, `git commit`, `git status`, `git diff` (local) | `git push` → `@lp-devops` |
| Criar/editar componentes, stores, services, types, rotas | `gh pr create/merge` → `@lp-devops` |
| Branch/checkout/merge local | Editar CI/`.mcp.json`/deploy → `@lp-devops` |

### @lp-ui-ux (Nina) — Interface

| Possui | Não possui |
|--------|-----------|
| Componentes, CSS, acessibilidade, fluxo UX | Lógica de dados/`services` → `@lp-front-dev` · git push |

### @lp-qa (Quinn) — Qualidade

| Possui | Não possui |
|--------|-----------|
| Quality gates, validação de fluxo, testes, veredito PASS/FAIL | Implementar a correção de produção (devolve a dev) · git push |

### @lp-doc (Duda) — Documentação

| Possui | Não possui |
|--------|-----------|
| README, comentários, material acadêmico (bilíngue) | Código de produção · git push |

## Fluxos de delegação

```
Feature:   @lp-front-dev (implementa) → @lp-ui-ux (refina UI) → @lp-qa (valida)
           → @lp-doc (documenta) → @lp-devops (push)

Git push:  QUALQUER agente → @lp-devops
MCP:       QUALQUER agente precisa → @lp-devops conecta
Segredo:   QUALQUER agente detecta → BLOQUEIA commit → @lp-devops
```

## Escalonamento

1. Agente não consegue concluir → escalar ao usuário com contexto (handoff).
2. Quality gate falha → retorna ao dev com feedback específico.
3. Segredo/credencial em texto plano detectado → BLOQUEIA commit, aciona `@lp-devops`.
