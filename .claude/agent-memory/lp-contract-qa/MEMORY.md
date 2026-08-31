# Memory Index — @lp-contract-qa

Memoria duravel do portao de contratos do LayoutParser React.

## Regras de memoria

- Grave fontes da verdade confirmadas, decisoes de compatibilidade e drifts recorrentes.
- Registre endpoint/DTO e data da verificacao, nunca documento ou payload real de usuario.
- Um contrato memorizado nao substitui MCP/OpenAPI/controller atual numa nova auditoria.

## Achados de contrato

- [segmentMappings sempre vazio](project_segmentmappings_dead_field.md) — campo tipado em
  `transformation.ts` nunca é populado nos pathways reais da API (2026-08-15).
- [Contrato field/section mappings](project_field_section_mappings_wire_2026_08_28.md) — contrato
  entregue, normalização tolerante no front e drift de serialização ainda aberto na API.
- [Detecção automática de layout](project_auto_layout_detection_2026_08_29.md) — distinção entre
  família e layout, colisões MQSeries/IDoc e contrato `unique|ambiguous|not_found` implementado.

## Fonte local atual

- `contracts/api-endpoints.json` registra owner, metodo e path consumidos.
- `npm run contract:check` cruza services + manifesto e, com `LAYOUTPARSER_OPENAPI_URL`, o
  OpenAPI da API. Paths parametrizados `{id}`, `:id` e templates TS sao normalizados.
- `GET /api/session` pertence ao BFF; parsing/catalogo/transformacao pertencem à API .NET.
