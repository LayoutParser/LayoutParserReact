---
description: Contrato #138/#141 entregue; wire atual omite nulls e pode serializar enums numericamente.
date: 2026-08-28
---

# Contrato fieldMappings / sectionMappings

Fonte confirmada: `LayoutParserApi/origin/develop` em `c1f3c1f`.

- `fieldMappings`, `sectionMappings` e `xmlNamespaces` são aditivos por candidato.
- `null`/ausente, `[]` e lista preenchida têm semânticas distintas.
- Field source usa ocorrência física 1-based + posição/comprimento 1-based; section occurrence
  não é localização física segura para edição.
- XPath usa namespace do candidato. Field target é `xpath`; section target é `xPath`.
- Serializer atual pode emitir enums de field mapping como números e omitir nulos. O front
  normaliza isso em `transformationService`, mas a API ainda deve alinhar wire e README.
- Validação comportamental contra ≥20 execuções reais do LowCodeRunner permanece UNVERIFIED.
