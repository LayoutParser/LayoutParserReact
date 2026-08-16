---
name: project-xml-navigable-tree-pbi127
description: PBI #127 (árvore XML navegável) implementado em feat/xml-navigable-tree — o que existe, decisões e o que falta para o PBI #128 bloqueado.
metadata:
  type: project
---

Epic #126 "Navegação vinculada TXT↔XML" tem 2 PBIs: #127 (árvore XML navegável, standalone,
não bloqueado — implementado) e #128 (vínculo bidirecional TXT↔XML, bloqueado por contrato
de API ausente — `segmentMappings` sempre vazio em runtime, ver
`docs/proposals/txt-xml-linked-navigation.md`).

**PBI #127 — implementado em `feat/xml-navigable-tree` (commit 746c733, branch local, sem
push):**

- Novo `src/utils/xmlTree.ts`: `parseXmlToTree(xml)` via `DOMParser` nativo (zero dependência
  nova). Trata `parsererror` sem lançar exceção. Ids de nó seguem a convenção
  `/tag[ocorrência-entre-irmãos-de-mesma-tag]`, alinhada à proposta de `xmlNodeOccurrence` do
  documento de design — pensado para o PBI #128 reaproveitar sem remontar a árvore.
- Novo componente `src/components/analysis/XmlTree.tsx` + `.css`: árvore expansível/
  colapsável, mesmo padrão de interação do `StructureTree.tsx` (expand/collapse por nó,
  "Expandir tudo"/"Recolher tudo", navegação por teclado ArrowUp/Down/Left/Right/Home/End,
  `role="tree"`/`treeitem"`). Atributos renderizados inline no cabeçalho do elemento
  (`@nome="valor"`), com classes CSS próprias (`xml-tree-attribute-name/value`) para
  diferenciação visual de elementos.
- `XmlTransformationDisplay.tsx`: `<textarea readOnly>` (linha ~427 antiga) substituído por
  `<XmlTree xml={activeCandidate.transformedXml} />`. `formatXmlForDisplay`/`formattedXml`
  removidos do componente (não usados em mais nenhum lugar do app, mas o utilitário em
  `xmlDelivery.ts` foi mantido — tem teste próprio e pode servir a outro uso). Copiar/baixar
  continuam usando `activeCandidate.transformedXml` bruto, não a árvore.
- Estado de expand/collapse é **local ao componente** (`useState`), não Zustand — não precisa
  ser store porque nada mais consome esse estado ainda (PBI #128 é quem introduziria
  `highlightedXmlNodeId` compartilhado, conforme seção 3 do doc de design).
- Lint pegou `react-hooks/set-state-in-effect` como erro ao tentar resetar `expandedIds` num
  `useEffect` — resolvido com o padrão "ajustar estado durante o render" (ver
  [[feedback-effect-setstate-lint]]).
- `npm run quality` completo passou (lint, typecheck, testes+cobertura front/server, builds
  dev/prod, artifacts:validate, format:check, audit, typecheck:e2e, contract:check).

**Próximo passo (fora do escopo desta sessão):** PBI #128 só pode avançar depois que a API
.NET confirmar o shape de `fieldMappings` (seção 2 do doc de design) — não inferir
correspondência TXT→XML via heurística no front.
