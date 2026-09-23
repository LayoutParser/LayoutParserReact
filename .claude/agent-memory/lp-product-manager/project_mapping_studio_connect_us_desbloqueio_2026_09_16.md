---
name: project-mapping-studio-connect-us-desbloqueio-2026-09-16
description: Story #267 desbloqueada (Ready) após API responder as 2 perguntas de contrato em API#425; decisão de escopo usa layout-tree.rules[] como fonte única de correlação visual
metadata:
  type: project
---

Sequência: [[project_mapping_studio_connect_us_tree_2026_09_16]] →
[[project_mapping_studio_connect_us_adr_wait_2026_09_16]] →
[[project_mapping_studio_connect_us_contract_questions_2026_09_16]] → esta memória (resolução).

API respondeu as 2 perguntas pendentes em LayoutParserApi#425 (comentado lá em 2026-09-16):

1. **Parcial:** `layout-tree.rules[].sourceElementGuid`/`targetElementGuid` batem com
   `explanation.sourceRefs[0]` no caso de vínculo direto campo→campo, mas
   `explanation.targetRefs` às vezes usa `TargetLeafName` (nome legível) em vez de GUID, e
   regras derivadas de DSL (prefixos `I./T.`) não aparecem em `layout-tree.rules[]` — API vai
   abrir fast-follow.
2. **Confirmada sem ressalva:** cardinalidade é sempre `number | null` (nunca string).

**Decisão de escopo (dono do produto, 2026-09-16):** o front usa `layout-tree.rules[]` como
**fonte única** para a correlação visual origem↔destino (par de GUIDs que ele mesmo devolve),
sem cruzar com `explanation.*Refs`. Isso contorna totalmente o problema do `TargetLeafName`.
Regras DSL ficam de fora da correlação visual nesta entrega — critério de aceite explícito exige
que sejam **contabilizadas/sinalizadas** (ex. "N regra(s) não representável(is) na árvore
ainda"), nunca escondidas silenciosamente.

**Why:** evita bloquear a Story #267 pelo fast-follow da API (sem ETA) e evita retrabalho de
tentar casar identificadores incompatíveis (GUID vs nome legível).

**How to apply:** Story #267 está `Ready` (label `blocked` removida, corpo reescrito com a
decisão e o novo critério de aceite). Ao delegar a implementação a `@lp-front-dev`, garantir que
ele leia o corpo atualizado da issue — não repita a decisão de escopo verbalmente sem apontar
para lá. Quando o fast-follow da API for aberto/resolvido, criar Story de continuação para cobrir
regras DSL na árvore; não reabrir #267 para isso.
