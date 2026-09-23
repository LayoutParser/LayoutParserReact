---
name: project-mapping-studio-connect-us-contract-questions-2026-09-16
description: Story #267 bloqueada por 2 perguntas específicas de contrato em API#425 (endpoint já implementado em develop)
metadata:
  type: project
---

Endpoint de árvore de layout por GUID (LayoutParserApi#425, bloqueador de
[[project_mapping_studio_connect_us_tree_2026_09_16]] / [[project_mapping_studio_connect_us_adr_wait_2026_09_16]])
já foi **implementado e mergeado em `develop`** via PR #427 (`LayoutTreeController`/
`LayoutTreeService`, commit 829a403) — ainda não promovido a produção. `#425` está CLOSED na API.

`@lp-contract-qa` revisou o contrato entregue e retornou **UNVERIFIED** (MCP indisponível, sem
OpenAPI local para fallback), com 2 lacunas reais publicadas como comentário em API#425 e no
corpo atualizado da Story #267 (2026-09-16):

1. O identificador de nó devolvido pelo `layout-tree` é o **mesmo valor** já usado em
   `MappingRuleExplanation.sourceRefs`/`targetRefs` (produção, `src/types/workspace.ts:103-104`)
   para mappers Sysmiddle? Sem isso, o badge "Regra_X" não pode ser posicionado no nó certo.
2. O formato de `min`/`max` (cardinalidade) é sempre `number`, ou existe caso não-numérico como
   `(+, "1.0")` visto na referência visual do Connect-Us (junto com `(-, 1, 1)` e `(-, 0, 999)`)?

**Why:** sem resposta a essas 2 perguntas, tipar `LayoutTreeNode`/componente de árvore no front
corre risco real de retrabalho — não é formalidade de processo, é ambiguidade genuína de
contrato que já causou drift em outros lugares do produto (`sourceRefs` já é `string[]` livre
sem formato documentado).

**How to apply:** Story #267 segue `Blocked` até resposta em API#425. Quando a resposta chegar,
não repetir a investigação — apenas verificar se as 2 perguntas acima foram respondidas e pedir
revalidação a `@lp-contract-qa` antes de desbloquear. Critério de aceite de `roots` como lista
(múltiplas raízes) já está fixado no corpo da Story como requisito de design confirmado, não
depende de resposta da API.
