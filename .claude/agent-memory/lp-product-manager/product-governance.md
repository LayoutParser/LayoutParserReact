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
