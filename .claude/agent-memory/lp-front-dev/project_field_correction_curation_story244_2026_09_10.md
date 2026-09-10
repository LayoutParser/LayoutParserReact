---
name: project_field_correction_curation_story244_2026_09_10
description: Story #244 (curadoria de correções de campo) implementada; contrato exato do payload ainda a reconfirmar com @lp-contract-qa.
metadata:
  type: project
---

Implementei a Story #244 (curadoria de correções de campo: aceitar/rejeitar antes do dataset de
treino de IA), persona curador/revisor — distinta do analista fiscal de #232/#234.

Arquivos: `src/types/fieldCorrectionCuration.ts`, `src/services/api/fieldCorrectionCurationService.ts`
(+ teste), `src/store/useFieldCorrectionCurationStore.ts` (+ teste),
`src/components/workspace/FieldCorrectionCuration/` (componente + CSS), rota
`workspace/field-correction-curation` em `src/routes.tsx`, card novo em `WorkspacePage.tsx`,
endpoints registrados em `contracts/api-endpoints.json` (`GET .../field-correction/pending`,
`POST .../field-correction/:param/review`, `deliveredBy: LayoutParserApi#345`).

**Por quê:** endpoints já confirmados em produção em 2026-09-10 pelo PM (ver
`.claude/agent-memory/lp-product-manager/project_field_correction_curation_2026_09_10.md`); a
Story só descreve os dois endpoints e o body `{decision}`, sem o schema completo do
`FieldCorrectionReport`. Modelei os campos (`nodePath`, `originalValue`, `correctedValue`,
`comment`, `reportedBy`, `reportedAt`, `status`) por inferência do que a Story #234 (report do
analista) produz — **não foi confirmado contra o payload real da API**.

**Como aplicar:** antes de considerar #244 fechada, `@lp-contract-qa` deve validar o schema real
de `FieldCorrectionReport` contra a API (nomes de campo podem divergir). Se divergir, ajustar só
`src/types/fieldCorrectionCuration.ts` e o mapeamento no componente — service/store já isolam a
camada HTTP corretamente.

**Nota de concorrência:** durante esta sessão havia trabalho paralelo não commitado de outro
agente tocando `FieldDivergenceModal.tsx`, `useFieldCorrectionStore.ts`,
`src/types/fieldCorrection.ts` e `src/utils/fieldCorrection.ts` (fluxo do analista fiscal #232/
#234) — **não fazem parte desta Story e não foram staged/commitados por mim**. Cuidado para não
confundir os dois nomes parecidos: `fieldCorrection.ts`/`useFieldCorrectionStore` (analista,
#232/#234) vs. `fieldCorrectionCuration.ts`/`useFieldCorrectionCurationStore` (curador, #244).
