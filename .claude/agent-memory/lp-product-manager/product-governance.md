---
name: product-governance
description: Baseline da governança do LayoutParser Web no GitHub.
type: project
---

Project canônico: `LayoutParser Web — Product Delivery`. Taxonomia e estados estão em
`.claude/rules/product-management.md`. O backlog inicial é reconstruído por capacidades e
resultados já entregues (harness, UX/gates, BFF/Entra, CI/CD/IIS, diagnóstico de transformação),
marcados como retrospectivos e ligados às evidências existentes.

Primeiro incremento ativo: edição segura de campo no TXT posicional. A edição é local e
fail-closed: só ocorre quando linha, `startPosition` 1-based e `length` permitem resolver um
intervalo exato; o novo valor deve ocupar exatamente o mesmo número de caracteres. A transformação
subsequente usa o TXT editado, sem deslocar qualquer campo.
