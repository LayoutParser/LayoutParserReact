---
name: ecosystem-and-flow
description: Fatos fixos do ecossistema LayoutParser e do fluxo de uso do app — raramente mudam.
metadata:
  type: project
---

- Aplicação web do ecossistema LayoutParser: UI React e BFF Node/Fastify. A API .NET é a fonte
  da verdade e nenhuma regra de parsing roda neste repo. Telas: `/upload`, `/analysis`, `/admin`.
- Fluxo: upload (TXT + layout XML) → análise (DocumentSummary, StructureTree,
  FieldDisplay/Properties e, desde 2026-07, também a aba "XML Transformação Final" — ver
  [[xml-transformation-feature]]) → admin (monitoramento/validações).
