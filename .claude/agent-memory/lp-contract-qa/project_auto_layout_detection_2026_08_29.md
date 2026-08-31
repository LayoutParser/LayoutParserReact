---
description: Estudo de contrato para detecção automática de layouts MQSeries/IDoc.
date: 2026-08-29
---

# Detecção automática de layout — entregue em branch

- O `LayoutDetector` da API identifica família (`mqseries`/`idoc`), não `layoutGuid`.
- `POST /api/parse/auto` e o fluxo arquivo-primeiro estão implementados nas branches coordenadas.
- Não usar `ParseAsync.Success` como match: linhas não identificadas e cardinalidades inválidas são
  toleradas/logadas para manter a visualização.
- Catálogo observado: 57 layouts; recorte NFe 4.00 com 5 MQSeries e 4 SAP IDoc.
- Amostra MQSeries: todos os cinco candidatos cobriram 59/59 registros; classificação correta é
  `ambiguous`. Marelli e Comau MQSeries compartilham 100% dos `InitialValue`.
- Amostra IDoc: somente Marelli cobriu 55/55 segmentos no recorte; pode ser `unique` após gates.
- `MinimalOccurrence` legado não é prova dura enquanto o catálogo não for migrado/validado.
- Decisão de produto aplicada: 100% de precisão nas auto-seleções, sem prometer 100% de cobertura.
- Refinamento: em `ambiguous`, devolver até cinco candidatos compatíveis ordenados por equivalência
  estrutural, com `rank`, `matchScore`, evidências e diferenças. Score não é probabilidade nem
  autoriza auto-seleção; a escolha vira `layoutGuidOverride` auditável.
- Contrato recomendado: `POST /api/parse/auto` com `unique|ambiguous|not_found`, evidências,
  `algorithmVersion`, `catalogVersion` e override manual explícito; implementado sem serializar XML.
- A API falha fechado quando o catálogo atinge o teto ou exclui um layout inválido; nesse estado
  não aceita override, evitando falsa unicidade por catálogo parcial.
- O front não aceita `unique` sem `selectedLayout`, mesmo que `candidates[0]` esteja presente.
- Evidência local: MQSeries real permanece `ambiguous` e processa só após override; IDoc real foi
  `unique` para Marelli e processou 55 linhas/263 campos; correlation ID foi preservado.
- Veredito local: `PASS`; tool MCP dedicada permanece evolução separada.
- Fonte detalhada: `docs/proposals/automatic-layout-detection-mqseries-idoc.md`.
