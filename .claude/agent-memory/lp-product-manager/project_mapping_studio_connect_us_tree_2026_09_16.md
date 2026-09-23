---
name: project-mapping-studio-connect-us-tree-2026-09-16
description: Story #267 (árvore dupla Connect-Us no Mapping Studio) criada, Blocked, bloqueada por API#425 (endpoint de árvore de layout por GUID); não é sub-issue de #233.
metadata:
  type: project
---

Dono do produto pediu (2026-09-16) que o Mapping Studio
(`src/components/mapping-studio/MappingStudioPage.tsx`) reproduza fielmente a ferramenta
desktop Connect-Us (árvore dupla origem/destino, regras inline, toolbar, abas
Mapeador/Regras/Transformação, painel de propriedades). Fidelidade total exigida — recusou
aproximação sem hierarquia real.

Ações tomadas:

- Story #267 (LayoutParser/LayoutParserReact, `type: user-story`, `priority: p2`,
  `area: frontend`, `blocked`) criada com critérios Given/When/Then, adicionada ao Project #3,
  Status=Blocked, Tipo=Story.
- Issue cross-repo LayoutParser/LayoutParserApi#425 criada pedindo
  `GET /api/layouts/{layoutGuid}/tree` (árvore completa: elementos/atributos/sequências,
  hierarquia, cardinalidade, identificador estável compatível com `rule.sourceRefs`/
  `targetRefs` da `MappingExplanation`). Linkada em #267 e vice-versa.
- Comentário cruzado em #233 ([EPIC] Editor visual de XML estilo XMLSpy): #267 **não** virou
  sub-issue de #233. #233 é visão de longo prazo sem detalhamento técnico nem priorização
  ("um futuro nosso"); #267 é escopo concreto, priorizado agora pelo dono, restrito à
  visualização de árvore de mapping existente (não editor de XML/XSD geral). Mantidas
  independentes com referência cruzada para eventual consolidação futura.

**Why:** gap de contrato já confirmado (sem investigação nova necessária) — `sourceRefs`/
`targetRefs` são strings soltas, não há endpoint de árvore de layout por GUID nem service que
o consuma no front (`layoutDatabase` em `src/services/api.ts` está declarado e nunca usado).

**How to apply:** não iniciar design/implementação de #267 até API#425 ser entregue e
revalidada por `@lp-contract-qa`. Se o usuário perguntar sobre editor XMLSpy (#233) no futuro,
verificar se avançou o suficiente para justificar fundir com #267.
