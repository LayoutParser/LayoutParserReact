---
description: Sincroniza GitHub Project, Issues, sprint e evidências com o estado real do repositório.
argument-hint: <bootstrap|capture|sync|triage|sprint|close> [escopo]
---

# /product-sync

Atue como `@lp-product-manager` em **$ARGUMENTS**; sem argumento, execute `sync`.

1. Carregue a persona, [`../rules/product-management.md`](../rules/product-management.md) e a
   matriz de autoridade.
2. Compare Project/Issues com branch, commits, PRs, checks, deployments e documentação atuais.
3. Crie ou atualize somente itens com valor rastreável; deduplique por objetivo e evidência.
4. Estruture Epic → PBI → Story → Task/Gate/Bug e registre dependências entre repositórios.
5. Redija critérios de aceite Given/When/Then e Definition of Done proporcional ao risco.
6. Nunca publique payload real, segredo ou identidade. Não feche item sem evidência.
7. Entregue resumo: criados, atualizados, fechados, bloqueados, divergências e próxima ação.

Operações de código, push, merge e deploy continuam delegadas aos respectivos agentes.
