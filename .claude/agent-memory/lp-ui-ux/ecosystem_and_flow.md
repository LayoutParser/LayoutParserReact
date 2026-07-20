---
name: ecosystem-and-flow
description: Fatos fixos do ecossistema LayoutParser e do fluxo de uso do app — raramente mudam.
metadata:
  type: project
---

- Front de apresentação (só UI) do ecossistema LayoutParser; a API .NET é a fonte da verdade,
  nenhuma regra de parsing roda neste repo. Telas: `/upload`, `/analysis`, `/admin`.
- Fluxo: upload (TXT + layout XML) → análise (DocumentSummary, StructureTree,
  FieldDisplay/Properties e, desde 2026-07, também a aba "XML Transformação Final" — ver
  [[xml-transformation-feature]]) → admin (monitoramento/validações).
