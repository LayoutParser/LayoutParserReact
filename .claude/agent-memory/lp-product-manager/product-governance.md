---
name: product-governance
description: Baseline da governança do LayoutParser Web no GitHub.
type: project
---

Project canônico: [`LayoutParserReact — Backlog`](https://github.com/orgs/LayoutParser/projects/3),
Project v2 privado número `3` da organização. Ele possui as views `Backlog`, `Board`, `Sprint`,
`Roadmap` e `Bugs & Gates`, além dos campos `Status`, `Tipo`, `Dono`, `Prioridade` e `Área`.
Taxonomia e estados estão em `.claude/rules/product-management.md`.

O baseline inicial importou 15 issues de capacidades e resultados já entregues (harness,
UX/gates, BFF/Entra, CI/CD/IIS, diagnóstico e edição posicional), preservando itens históricos
como `Done` e trabalho futuro ou bloqueado em seus estados reais.

Primeiro incremento ativo: edição segura de campo no TXT posicional. A edição é local e
fail-closed: só ocorre quando linha, `startPosition` 1-based e `length` permitem resolver um
intervalo exato; o novo valor deve ocupar exatamente o mesmo número de caracteres. A transformação
subsequente usa o TXT editado, sem deslocar qualquer campo.

IDs de campo do Project 3 (para `gh project item-edit`), reusar em vez de re-descobrir via
`gh project field-list`: `PROJECT_ID=PVT_kwDODnBfYs4BgM9h`. Status
`PVTSSF_lADODnBfYs4BgM9hzhaaW7I` (Backlog `8247617d`, Ready `5c74a199`, In Progress `b692f099`,
In Review `1047fa44`, In Validation `e84d3fd4`, Done `7f774e3a`, Blocked `33b609c0`). Tipo
`PVTSSF_lADODnBfYs4BgM9hzhaaXLc` (Epic `59b1b69f`, PBI `75fd3645`, Story `bb1f3c47`, Task
`c9aa38e2`, Bug `f912dca7`, Gate `83341334`). Dono `PVTSSF_lADODnBfYs4BgM9hzhaaXLg` (um option id
por agente, ex. `lp-qa` `b2363da4`, `lp-front-dev` `651e9b69`). Prioridade
`PVTSSF_lADODnBfYs4BgM9hzhaaXMA` (P0 `717f401f`, P1 `3b4b7ea8`, P2 `878b14b4`, P3 `85e85ed3`).

Issue #140 (contrato de polling do fallback de IA, criada por `@lp-contract-qa`/API team) tinha
chegado ao repo sem labels e sem entrar no Project — issues externas/técnicas nem sempre nascem
classificadas; ao encontrá-las, adicionar ao Project 3 e classificar (labels + campos) antes de
tratar como item de backlog rastreável.
