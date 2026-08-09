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
- `POST /api/parse/upload` (FormData: layoutFile, txtFile, layoutName?, layoutType?, layoutConfig?) → `ParseResponse`. **422** quando não parseia: `application/json` `{success:false, detectedType, message}` + header `X-Correlation-ID` (validado em runtime 2026-08-03). **400** (falta arquivo) vem como `application/problem+json`, **sem** campo `message`.
- `GET /api/layoutdatabase/mqseries-nfe`, `POST /api/layoutdatabase/refresh-cache`.
- `GET /api/monitoring/layouts-analysis`, `GET /api/monitoring/layout-validations`.
- `GET /api/mapperdatabase/by-input/{layoutGuid}` (200 com mapper | 404 "não encontrado"), `POST /api/transformationexecution/execute` — ver detalhe em [Feature XML Transformação](project_xml_transformation_feature.md).
- `POST /api/transformationexecution/execute-candidates` (multi-candidato; **sem hífen**, validado em runtime em 2026-08-05) e `POST /api/xml-analysis/diagnose-validation-error` (diagnóstico IA/Ollama) — integrados, ver [Handoff aba de análise](project_document_analysis_tab_handoff.md). O request deve mandar `layoutGuid` do parse e strings vazias, não `null`, nos campos não anuláveis de tipo/saída.
- `GET /api/ai-metrics/generations` e `GET /api/ai-metrics/summary` — contrato antecipado (back-end ainda não implementou), ver [Painel de métricas de IA (Gap 3)](project_ai_metrics_panel_gap3.md).

## Gates
`npx tsc --noEmit`, `npm run build` e `npm run format:check` passam na branch `chore/normaliza-crlf` (validado em 2026-08-05). Sem suite de testes ainda (mas dá para testar helper puro com esbuild+node — ver [Ambiente local](reference_ambiente_local_dev.md)).
**`npm run lint` continua vermelho**, agora por 30 warnings preexistentes de `no-explicit-any`/hooks e não mais por CRLF. Use lint direcionado nos arquivos tocados e `--quiet` para confirmar ausência de erros, mas não trate isso como substituto da dívida global.
`node_modules` pode não estar instalado (rodar `npm install` primeiro). Os ~12 erros de `tsc` (`noUnusedLocals`/TS7006) de 6 arquivos antigos foram **corrigidos em 2026-07-20** — se reaparecerem, é regressão nova.

## Aprendizados
- [Ambiente local de dev](reference_ambiente_local_dev.md) — a API roda em **:5100** (não :5000) e o Vite em **:3000**; sonde antes de assumir "sem backend". Catálogo de layouts costuma cair por timeout de pool SQL, o que impede exercitar o parse pela UI.
- [Gates: dívida de CRLF](gates_crlf_divida.md) — `lint`/`format:check` são vermelhos por dívida commitada; como provar que não é regressão sua.
- **Duas fontes concorrentes de identificador/estado da transformação** (padrão de defeito recorrente): (a) o `layoutGuid` do **catálogo** pode vir **zerado**, enquanto o do **parse** vem correto — consultar mapper com o zerado esconde a aba de XML para sempre (resolvido em `utils/layoutGuid.ts`, priorizando o do parse); (b) a aba é decidida por `mapperAvailable` (2ª chamada HTTP) e não por `transformationsStatus` (que já vem no parse) — isso é **critério de negócio confirmado com o usuário**, não "simplifique" sem aprovação.
- `transformationsStatus: 'not_applicable'` é **ambíguo na origem**: o back-end emite a mesma string para "o gate barrou o documento" e para "rodou e nenhum mapper serviu". Não invente distinção na UI; quem resolve é o campo `transformationsReason` (aditivo, ainda não emitido).
- `transformationsStatus: 'processing'` **nunca resolve**: não há polling no front nem endpoint que leia o resultado persistido em background. Qualquer rótulo de "processando..." fica preso para sempre.
- [Painel de métricas de IA (Gap 3)](project_ai_metrics_panel_gap3.md) — implementado em `feat/document-analysis-tab` contra contrato antecipado; 404 esperado até o back-end publicar de verdade.
- [Handoff aba de análise (multi-candidato/diagnóstico IA)](project_document_analysis_tab_handoff.md) — antes de "criar a aba de análise" checar se já não existe via `AnalysisModeTabs`/`useTransformationStore`; Gaps 1 (multi-candidato) e 2 (diagnóstico IA) já integrados em `feat/document-analysis-tab`, faltando validação end-to-end contra Ollama real.
- [Feature TXT Posicional vs XML Transformação Final](project_xml_transformation_feature.md) — achados cross-repo + contrato validado em runtime (mapper é o critério certo, layoutType é sempre "2" nos dados reais) + implementação já feita em `feat/xml-transformation-toggle`.
- [Convenções reais vs. doc escrita](feedback_convencoes_reais_vs_doc.md) — código real não usa alias `@/` nem pasta própria por componente; seguir o código, não a doc.
- `components/analysis/AnalysisSection.tsx` **e também** `components/upload/UploadSection.tsx` + `components/upload/LayoutSearch.tsx` são código morto (árvore inteira não alcançável a partir de `routes.tsx`) — fluxo real é o layout em "L" de `LayoutParserPage.tsx`, que usa `LayoutCombobox` diretamente. `LayoutCombobox` em si é vivo (usado pelos dois lados).
- `Array.prototype.reduce()` sobre um array `any[]` "contamina" a inferência do acumulador para `any` mesmo com `{} as Record<...>` no valor inicial — dispara TS7006 em callbacks encadeados (`.map()` dentro do resultado). Fix sem introduzir `any` novo: mover a anotação pro argumento de tipo genérico explícito, `fields.reduce<Record<string, any[]>>((acc, field) => ..., {})`, em vez de `fields.reduce((acc, field) => ..., {} as Record<string, any[]>)` — mesmo tipo, só preserva a inferência corretamente.
