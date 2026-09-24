---
name: manual-edit-derived-release-governance
description: Issue #229 - sincronizacao da release ativa apos edicao manual e aviso de governanca; achado de tipo sobre engine 'sysmiddle' em MappingRelease
metadata:
  type: project
---

Issue #229 pedia: (a) edicao manual de artefato cria release nova (ja satisfeito por #226,
`editArtifact` sempre gera `artifactSource: 'manual_edit'` + `derivedFromReleaseId`) e (b) gate
de regressao obrigatoria antes de aprovar/publicar (ja satisfeito estruturalmente por
`isMappingGovernanceActionAllowed` em `src/utils/mappingGovernanceGuards.ts`, que so libera
`approve` a partir de `test_passed`).

O gap real estava em `MappingTestLabPanel.tsx`: o callback `onReleaseCreated` do
`MappingArtifactManualEditor` atualizava o estado local (`releaseResult`) mas NAO o
`releaseId` da URL. Como `release = releaseResult?.releaseId === releaseIdFromUrl ? ... :
null`, a tela ficava mostrando `null`/release antiga logo apos uma edicao bem-sucedida —
falha silenciosa que escondia a necessidade de rodar o Test Lab de novo. Corrigido: o
callback agora tambem chama `setSearchParams` com o novo `releaseId` e limpa `compileJob`/
`testJob` obsoletos.

Tambem foi adicionado um aviso explicito em `MappingGovernanceReadiness.tsx` quando
`release.artifactSource === 'manual_edit'` e o status ainda e `draft_compiled`/`test_failed`
(nao usar `test_passed`, que ja passou pelo gate).

**Achado de tipo (reportar a [[project_fiscal_contract_drift_2026_09_15]] / @lp-contract-qa se
reaparecer):** o coordenador pediu para bloquear a edicao manual quando `release.engine ===
'sysmiddle'`, mas `MappingRelease.engine` (em `src/types/mappingRelease.ts`) e tipado como
`MappingAuthoringEngine = 'tcl' | 'xslt'` — sysmiddle nunca e um valor possivel, porque
`MappingDraft.engine` (origem da release) tambem exclui sysmiddle. Alem disso,
`MappingTestLabPanel` so e renderizado quando `draft && effectiveCapabilities.author` em
`MappingStudioPage.tsx`, e para sysmiddle `effectiveCapabilities.author` e forcado a `false`
(linha ~452-460). Ou seja, o editor manual de artefato e inalcancavel para sysmiddle tanto por
tipo quanto por gating de UI — nao implementei o check adicional porque seria codigo morto/
comparacao sem overlap de tipo. Se a API algum dia permitir Sysmiddle virar
MappingDraft/MappingRelease, os tipos precisam ser ampliados primeiro (contrato), so entao o
check de engine faria sentido.

Arquivos tocados: `src/components/mapping-studio/MappingTestLabPanel.tsx`,
`MappingTestLabPanel.test.tsx`, `MappingGovernanceReadiness.tsx`. Branch
`feat/manual-edit-derived-release-governance` a partir de `fix/mapping-explanation-optional-fields`
(que tem a feature #226 completa; `develop` na epoca ainda NAO tinha essa feature mergeada —
cuidado ao branchear para trabalho em cima de #226/#229, confirmar primeiro se `develop` ja
tem `MappingArtifactManualEditor.tsx` antes de usar `develop` como base).
