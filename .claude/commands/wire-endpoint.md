---
description: Liga um endpoint novo da API ao front (tipo → service → store → componente).
argument-hint: <METHOD> <caminho> (ex.: GET /api/metrics/summary)
---

# /wire-endpoint

Conecte o endpoint **$ARGUMENTS** da LayoutParserApi ao front, ponta a ponta, sem quebrar o
padrão de camadas. A regra de negócio é da API — aqui só consumimos o contrato.

## Passos

1. **Confirme o contrato** na API (não invente shape): leia o controller/DTO correspondente
   em `../LayoutParserApi`, ou use a tool MCP `list_endpoints` / `api_get` se o MCP estiver
   conectado. Em dúvida, pergunte ao usuário.
2. **Tipos:** adicione/atualize as interfaces de request/response em `src/types`.
3. **Service:** crie a função na camada `services/` reutilizando `apiClient` de
   [`src/services/api.ts`](../../src/services/api.ts) (mantém `X-Correlation-ID`). Trate erro
   com o padrão `axios.isAxiosError`.
4. **Store:** se o dado é compartilhado, exponha estado/ação no store Zustand de domínio
   (ou crie um novo store seguindo o padrão dos existentes).
5. **Componente:** consuma via store/props; mostre estados de loading/vazio/erro.
6. **Gates:** `npm run lint && npx tsc --noEmit && npm run build`.
7. Avise `@lp-doc` para atualizar a tabela de endpoints do README.

## Restrições
- Componentes **não** chamam `axios` direto — só via `services/`.
- Não use `any` novo. Persona: `@lp-front-dev`.
