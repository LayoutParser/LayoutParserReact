# Memória — @lp-front-dev (Remy)

> Fatos duráveis do projeto + aprendizados acumulados. Atualize ao descobrir algo não óbvio.

## Ecossistema (fixo)
- Front Vite+React+TS. **Regra de negócio mora na API .NET** (`LayoutParserApi`, hub). Aqui é só apresentação.
- Repos: Api (hub) · Lib (cripto) · Decrypt (.exe) · React (este).

## Stack & convenções
- React 18.2, react-router-dom 6.20 (`createBrowserRouter`), Zustand 4.4, Axios 1.6, TS 5.2 strict.
- Alias `@/` → `src/`. HTTP **só** em `services/`. Tipos em `src/types`. Não introduzir `any` novo.
- 5 stores: `useAppStore` (upload/parse), `useLayoutStore`, `useFieldStore`, `usePropertiesStore`, `useSearchStore`.
- `apiClient` (axios) injeta `X-Correlation-ID` — **não remover** o interceptor.

## Endpoints consumidos
- `POST /api/parse/upload` (FormData: layoutFile, txtFile, layoutName?, layoutType?, layoutConfig?) → `ParseResponse`.
- `GET /api/layoutdatabase/mqseries-nfe`, `POST /api/layoutdatabase/refresh-cache`.
- `GET /api/monitoring/layouts-analysis`, `GET /api/monitoring/layout-validations`.

## Gates
`npm run lint && npx tsc --noEmit && npm run build`. Sem suite de testes ainda.

## Aprendizados
- (adicione aqui o que descobrir: gotchas de build, quirks de stores, etc.)
