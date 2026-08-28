---
description: Proveniência P0, identidade física, mappings TXT↔XML e inspetor responsivo implementados.
date: 2026-08-28
---

# Proveniência e rastreabilidade TXT ↔ XML

- Branch de implementação: `codex/feat-provenance-linked-inspector`, criada de `develop`.
- `useAppStore` grava `parsedDocumentProvenance`; trocar arquivo/layout limpa parse, edição,
  transformação, busca e seleção. Edição pendente exige confirmação.
- Transformação e revalidação conferem o layout da proveniência antes de chamar a API.
- Identidade física está centralizada em `utils/fieldIdentity.ts`; nunca usa valor. Prioriza
  GUIDs + ocorrência + posição + comprimento e possui fallback nominal/posicional.
- Contrato #138/#141 tipado em `types/transformation.ts`. O service normaliza temporariamente
  enum numérico/string e propriedades nulas omitidas no wire atual da API.
- `utils/fieldMapping.ts` resolve origem por coordenadas físicas e destino por XPath namespaced,
  `nodeKind` e ocorrência XML 1-based. Não há heurística por valor/localName.
- `LinkedFieldInspector` diferencia `null`, `[]`, mappings preenchidos, confiança e limitações.
  `sectionMappings` só navega bloco; nunca edita campo.
- Desktop usa painel lateral; até 900 px usa `Modal`/bottom sheet. FieldDisplay e XmlTree usam
  roving tabindex, setas e foco cruzado. Mobile oferece lista de campos por ocorrência (44 px).
- Caveat permanente: mappings ainda não foram comparados contra ≥20 execuções reais do
  LowCodeRunner Windows; “Authoritative” aparece como “Declarado no mapeador”, nunca “validado”.
- Fix complementar no mesmo branch: `parseFieldNormalization.ts` compõe `ParsedField.start` com
  `LengthField`/GUIDs do layout, mantendo campos vazios com largura editável. Entradas agregadas
  (`isAggregatedOccurrence` ou `occurrence=0`) são removidas da lista física, evitando a LINHA081
  duplicada no fim. Sequencial de 6 dígitos repetido é desambiguado pelo código da linha 7–9.

Documento de produto: `docs/features/txt-xml-traceability.md`.
