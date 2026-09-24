---
name: fiscal-contract-drift-2026-09-15
description: 4 endpoints/campos fiscais novos entregues pela API em 2026-09-15 (#198/#226/#228) — só types+services implementados, sem UI, shapes não confirmados via MCP.
metadata:
  type: project
---

Em 2026-09-15 a API (LayoutParserApi) entregou em produção 4 mudanças de contrato
desbloqueando #198, #226 e #228. `@lp-contract-qa` confirmou DRIFT sem MCP disponível na
sessão dele (comparação só contra `src/types`/`src/services`, não contra fonte canônica).
Implementei a camada de dados na branch `feat/fiscal-profile-manual-edit-diff-contract`
(a partir de `develop`), commit `e7f2b1b`:

- **Perfil fiscal (#198)**: `PUT .../mapping-drafts/{draftId}/fiscal-profile` →
  `mappingDraftService.setFiscalProfile`. `fiscalProfile`/`resolvedXsd` adicionados a
  `MappingDraft` e `MappingRelease` (reaproveitei `FiscalProfile` de `workspace.ts`;
  `ResolvedXsdReference` é tipo novo em `workspace.ts`).
- **Edição manual de artefato (#226)**: `PATCH .../mapping-drafts/{draftId}/artifacts/{engine}`
  → `mappingReleaseService.editArtifact`, com `If-Match`/412/428/400/422 no mesmo padrão de
  `mappingDraftService.updateRule`. `MappingRelease` ganhou `artifactSource`,
  `derivedFromReleaseId`, `manualEditReason`, `manuallyEditedArtifactKinds`.
- **Diff granular por ruleId (#228)**: `divergencesByRuleId` (nullable) em
  `MappingTestRunSummary` — achado do contract-qa era que esse campo aditivo seria descartado
  em silêncio pelo parser antigo; corrigido.
- **Diff A×B + cobertura (#198)**: `mappingReleaseService.getReleasesDiff` (novo) e campo
  `requiredCoverage` em `MappingRelease`.

**Não implementado nesta entrega**: nenhuma UI (sem tela de perfil fiscal, sem editor de
artefato manual, sem view de diff A×B). `MappingArtifactDiffView` existente é diff textual de
artefato via `utils/lineDiff`, não usa `divergencesByRuleId` nem o novo diff agregado — ficou
fora de escopo, não tem relação direta.

**Por quê o MCP não foi usado**: `layoutparser` MCP falhou com `CONNECTION_CLOSED` nesta
sessão (API não estava rodando/acessível). Os shapes de `ResolvedXsdReference` e
`MappingReleaseDiff`/`MappingReleaseDiffElementChange` são **não confirmados** — modelados a
partir da descrição funcional recebida, marcados em comentário no código. Ver
[[project_mapping_studio_slices_6_7_2026_09_01]] para o padrão de governança RBAC já
existente que os novos endpoints reutilizam (approve/publish/rollback).

**Como aplicar**: antes de construir UI sobre `resolvedXsd`, `requiredCoverage` ou o diff A×B,
peça para `@lp-contract-qa` revalidar com o MCP disponível — não amplie os tipos assumindo que
o shape atual está certo.
