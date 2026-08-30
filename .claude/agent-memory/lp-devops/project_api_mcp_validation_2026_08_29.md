---
name: project-api-mcp-validation
description: Validação local do MCP da LayoutParserApi para a detecção automática de layout.
type: project
date: 2026-08-29
---

# MCP da API — validação para detecção automática

- O projeto `LayoutParserApi/mcp/LayoutParserMcp` compilou em Release sem warnings ou erros.
- O servidor inicializou via stdio com protocolo MCP `2025-06-18` e versão `1.0.0.0`.
- Tools observadas: `parse_document`, `api_get`, `api_post` e `list_endpoints`.
- `api_get /health` retornou saudável.
- `api_get /health/ready` retornou degradado somente porque o Ollama local não corresponde ao
  ambiente real separado; catálogo, SQL, Redis, decryptor e runner estavam saudáveis.
- `POST /api/parse/auto` está implementado na branch coordenada da API e foi validado diretamente
  com MQSeries e IDoc reais; o MCP genérico poderá chamá-lo via `api_post` após a promoção.
- `list_endpoints` retornou `404` porque Swagger está desabilitado no runtime Production.
- `.mcp.json` local aponta para a DLL Release e está ignorado pelo Git; não contém segredo.
- O MCP expõe capacidades da API. Coordenação entre agentes usa subagentes e handoffs.
- A tool tipada `detect_layout` continua rastreada em LayoutParserReact #184 e LayoutParserApi #216;
  não bloqueia o contrato HTTP nem duplica regra de domínio no front.
