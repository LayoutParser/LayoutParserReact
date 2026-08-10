---
description: Compara contrato da API com types/services/consumidores e aponta drift.
argument-hint: <METHOD caminho|dominio|all> (ex.: POST /api/parse)
---

# /contract-sync

Atue como `@lp-contract-qa` e valide **$ARGUMENTS**. O comando audita a sincronizacao; quem
implementa eventual correcao e `@lp-front-dev` ou a equipe da API.

## Passos

1. Carregue a persona [lp-contract-qa](../agents/lp-contract-qa.md), as regras de
   [MCP](../rules/mcp-usage.md) e [autoridade](../rules/agent-authority.md).
2. Obtenha o contrato pela fonte da verdade: MCP `list_endpoints` ja conectado; como fallback,
   leia OpenAPI/controllers/DTOs em `../LayoutParserApi`. Sem fonte, marque `UNVERIFIED`.
3. Compare metodo, rota, parametros, multipart, headers, nomes/casing, tipos, nulabilidade,
   enums, response, XML/binario e envelope de erro com `src/types` e `src/services`.
4. Siga os consumidores ate store/props/componente e confira correlation ID, timeout,
   cancelamento, mocks e mensagens de erro.
5. Rode `npm run typecheck` e testes focados existentes, sem alterar produto ou fixtures.
6. Entregue matriz `Operacao | Fonte API | Front | Status | Evidencia`, usando somente
   `PASS`, `DRIFT` ou `UNVERIFIED`, seguida do handoff da mudanca minima.

## Restricoes

- Nao invente contrato, nao configure MCP e nao execute POST/parse com documento real.
- Compilacao verde nao prova compatibilidade em runtime.
- Revalide qualquer DRIFT corrigido antes de encaminhar a `@lp-qa` e `@lp-doc`.
