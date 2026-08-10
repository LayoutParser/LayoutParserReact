# Memory Index — @lp-contract-qa

Memoria duravel do portao de contratos do LayoutParser React.

## Regras de memoria

- Grave fontes da verdade confirmadas, decisoes de compatibilidade e drifts recorrentes.
- Registre endpoint/DTO e data da verificacao, nunca documento ou payload real de usuario.
- Um contrato memorizado nao substitui MCP/OpenAPI/controller atual numa nova auditoria.

## Fonte local atual

- `contracts/api-endpoints.json` registra owner, metodo e path consumidos.
- `npm run contract:check` cruza services + manifesto e, com `LAYOUTPARSER_OPENAPI_URL`, o
  OpenAPI da API. Paths parametrizados `{id}`, `:id` e templates TS sao normalizados.
- `GET /api/session` pertence ao BFF; parsing/catalogo/transformacao pertencem à API .NET.
