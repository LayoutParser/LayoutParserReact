---
name: test-suite-execution-story204
description: Fiscal Test Lab por suíte versionada (LayoutParserApi#423) implementado no front — decisão sobre shape desconhecido de fixtureResults
metadata:
  type: project
---

Item #204 (Fiscal Test Lab) tinha um gap de execução em lote (múltiplas fixtures numa suíte
versionada), que o `@lp-contract-qa` confirmou como já implementado na API em
`Controllers/TestSuiteController.cs` (LayoutParserApi#423). Implementei em
`feat/test-lab-suite-execution` (commit f2a9ab2, a partir de `develop`):

- `src/types/testSuite.ts` — `TestSuite`, `TestFixture`, `TestSuiteRun`, `TestSuiteFixtureResult`.
- `src/services/api/testSuiteService.ts` — mesmo padrão de type guards/erro tipado de
  `mappingReleaseService.ts`; rota base
  `api/workspaces/{workspaceId}/mapping-drafts/{draftId}/test-suites`.
- `src/components/mapping-studio/MappingTestSuitePanel.tsx` — montado dentro de
  `MappingTestLabPanel.tsx` só quando `release.engine === 'xslt' && executeEnabled` (mesma
  condição do formulário de fixture única).
- `contracts/api-endpoints.json` — 7 endpoints novos, `deliveredBy: LayoutParserApi#423`.

Decisão importante: o `@lp-contract-qa` só confirmou a ASSINATURA do endpoint `run`, não o
shape interno de `fixtureResults`. Em vez de inventar campos de divergência, tipei
`TestSuiteFixtureResult` com o mínimo confirmável (fixtureId, fixtureName com fallback pro id,
passed, durationMs) e guardei o resto em `raw: unknown`. Se a UI precisar mostrar divergências
por fixture no futuro, PRIMEIRO confirmar o shape real (rodar contra API ao vivo ou pedir
`@lp-contract-qa`) antes de expandir o parser — não amplie `raw` por suposição.

Outra decisão: a execução da suíte (`POST {suiteId}/run`) é SÍNCRONA — sem job/polling, ao
contrário do test-run de fixture única em `mappingReleaseService.createTestRun`
(assíncrono com `MappingTestRunJob`). Não confundir os dois fluxos.

Gates rodados: lint (0 erros/warnings), typecheck, contract:check (54 endpoints, 5 propostos),
suite completa (72 arquivos, 490 testes) — todos verdes. Sem push/PR, só commit local.

Ver também [[project_mapping_studio_slices_3_5]] e a memória de convenções reais antes de
ampliar padrões.
