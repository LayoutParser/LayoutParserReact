# Memória — @lp-front-dev (Remy)

> Fatos duráveis do projeto + aprendizados acumulados. Atualize ao descobrir algo não óbvio.

## Ecossistema (fixo)
- Front Vite+React+TS. **Regra de negócio mora na API .NET** (`LayoutParserApi`, hub). Aqui é só apresentação.
- Repos: Api (hub) · Lib (cripto) · Decrypt (.exe) · React (este).

## Stack & convenções
- React 18.2, react-router-dom 6.20 (`createBrowserRouter`), Zustand 4.4, Axios 1.6, TS 5.2 strict.
- Doc diz alias `@/` → `src/` e "componente = pasta própria", mas **o código real 100% usa path relativo e nunca usa subpasta por componente** — ver [Convenções reais vs. doc](feedback_convencoes_reais_vs_doc.md), seguir o código.
- HTTP **só** em `services/`. Tipos em `src/types`. Não introduzir `any` novo.
- 7 stores: `useAppStore` (upload/parse), `useLayoutStore`, `useFieldStore`, `usePropertiesStore`, `useSearchStore`, `useStructureStore`, `useTransformationStore` (mapper/transformação XML).
- `apiClient` (axios) injeta `X-Correlation-ID` — **não remover** o interceptor.

## Endpoints consumidos
- `POST /api/parse/upload` (FormData: layoutFile, txtFile, layoutName?, layoutType?, layoutConfig?) → `ParseResponse`.
- `GET /api/layoutdatabase/mqseries-nfe`, `POST /api/layoutdatabase/refresh-cache`.
- `GET /api/monitoring/layouts-analysis`, `GET /api/monitoring/layout-validations`.
- `GET /api/mapperdatabase/by-input/{layoutGuid}` (200 com mapper | 404 "não encontrado"), `POST /api/transformationexecution/execute` — ver detalhe em [Feature XML Transformação](project_xml_transformation_feature.md).

## Gates
`npm run lint && npx tsc --noEmit && npm run build`. Sem suite de testes ainda.
**Atenção:** `node_modules` pode não estar instalado neste ambiente (rodar `npm install` primeiro). CRLF generalizado é dívida pré-existente **ainda não resolvida** (commitado desde antes, ex. `App.tsx` já tem `\r` no HEAD) — `npm run lint`/`format:check` crus continuam falhando por causa disso; ao validar uma feature nova, rode lint/tsc isolado nos arquivos tocados e confirme via `git diff --stat` contra HEAD que os erros restantes são pré-existentes, não regressão sua. Os ~12 erros de `tsc` (`noUnusedLocals`/TS7006) que existiam em 6 arquivos antigos foram **corrigidos em 2026-07-20** (ver Aprendizados) — se reaparecerem em outros arquivos, é regressão nova, não a mesma dívida.

## Aprendizados
- (adicione aqui o que descobrir: gotchas de build, quirks de stores, etc.)
- [Feature TXT Posicional vs XML Transformação Final](project_xml_transformation_feature.md) — achados cross-repo + contrato validado em runtime (mapper é o critério certo, layoutType é sempre "2" nos dados reais) + implementação já feita em `feat/xml-transformation-toggle`.
- [Convenções reais vs. doc escrita](feedback_convencoes_reais_vs_doc.md) — código real não usa alias `@/` nem pasta própria por componente; seguir o código, não a doc.
- `components/analysis/AnalysisSection.tsx` **e também** `components/upload/UploadSection.tsx` + `components/upload/LayoutSearch.tsx` são código morto (árvore inteira não alcançável a partir de `routes.tsx`) — fluxo real é o layout em "L" de `LayoutParserPage.tsx`, que usa `LayoutCombobox` diretamente. `LayoutCombobox` em si é vivo (usado pelos dois lados).
- `Array.prototype.reduce()` sobre um array `any[]` "contamina" a inferência do acumulador para `any` mesmo com `{} as Record<...>` no valor inicial — dispara TS7006 em callbacks encadeados (`.map()` dentro do resultado). Fix sem introduzir `any` novo: mover a anotação pro argumento de tipo genérico explícito, `fields.reduce<Record<string, any[]>>((acc, field) => ..., {})`, em vez de `fields.reduce((acc, field) => ..., {} as Record<string, any[]>)` — mesmo tipo, só preserva a inferência corretamente.
