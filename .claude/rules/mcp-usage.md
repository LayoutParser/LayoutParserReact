---
description: Como o front LayoutParser React conecta e usa o MCP Server (que vive na API).
---

# MCP Usage — LayoutParser React

## Resumo

- O **MCP Server é da API** (`LayoutParserApi/mcp/LayoutParserMcp/`, C# / .NET 10). Este front
  **não cria** MCP — apenas **se conecta** a ele para que agentes possam parsear documentos e
  consultar o catálogo via *tools*, sem hardcodar rotas HTTP.
- Prefira **ferramentas nativas** do Claude Code (Read/Edit/Grep/Glob/Bash) para mexer no
  código deste repo. As *tools* MCP servem para **operações de domínio** contra a API rodando.
- **Gestão de MCP é exclusiva do `@lp-devops`.**

## Arquitetura

```
Agente/LLM ──(MCP stdio)──► LayoutParserMcp (C#) ──(HTTP)──► LayoutParserApi ──► Redis/SQL/Ollama
```

O MCP é um **cliente fino sobre a API HTTP** — a API é a fonte da verdade. Tools expostas:
`parse_document`, `list_endpoints`, `api_get`, `api_post`.

## Como conectar (responsabilidade do @lp-devops)

1. Buildar o MCP na API: `dotnet build -c Release` em `LayoutParserApi/mcp/LayoutParserMcp`.
2. Copiar [`.mcp.json.example`](../../.mcp.json.example) → `.mcp.json` na raiz deste repo.
3. Ajustar o caminho **absoluto da DLL** e `LAYOUTPARSER_API_URL`.
4. Aponte para a **DLL compilada** — nunca `dotnet run` (corromperia o protocolo stdio).
5. Reiniciar a sessão / `claude mcp list` para confirmar as tools.

## Regras

- A API precisa estar **no ar** para as tools funcionarem (default `http://localhost:5000`).
- `.mcp.json` pode conter caminhos de máquina — trate como config local (ver `.gitignore`).
- Não exponha via MCP nada que vaze segredos. Setup detalhado:
  [`LayoutParserApi/mcp/LayoutParserMcp/README.md`](../../../LayoutParserApi/mcp/LayoutParserMcp/README.md).
