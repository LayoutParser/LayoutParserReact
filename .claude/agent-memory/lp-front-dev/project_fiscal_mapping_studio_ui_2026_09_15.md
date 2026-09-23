---
name: fiscal-mapping-studio-ui-2026-09-15
description: UI implementada sobre o contrato fiscal de #198/#226/#228 (perfil fiscal, edição manual de artefato, diff A×B) na branch feat/fiscal-mapping-studio-ui, a partir de develop.
metadata:
  type: project
---

Em 2026-09-15, a partir de `develop` (com #252/#255 já mergeados), implementei a UI que
faltava sobre o contrato descrito em [[project_fiscal_contract_drift_2026_09_15]]. Branch
`feat/fiscal-mapping-studio-ui`, commit `cc46382`.

- **Perfil fiscal (#198)**: `MappingFiscalProfilePanel.tsx` (novo) — formulário
  documentType/schemaVersion/operation/jurisdiction, mostra `resolvedXsd` read-only, trata
  `rejected`/`not_found`. Renderizado em `MappingStudioPage.tsx` quando há draft com
  `capabilities.author`.
- **Editor manual de artefato (#226)**: `MappingArtifactManualEditor.tsx` (novo) — textarea +
  justificativa obrigatória, trata sucesso (nova release derivada), `conflict` (412, mostra
  `currentArtifact` e permite recarregar), `precondition` (428), `rejected` (422),
  `not_found` (404). RBAC é só otimista: `canEditArtifactManually` em
  `MappingTestLabPanel.tsx` libera mapper/fiscal_admin/owner, mas o backend hoje só checa
  membership — não há gate de papel real ainda (confirmado no drift anterior).
- **Diff granular por ruleId (#228)**: estendido dentro de `MappingTestLabPanel.tsx` — toggle
  para agrupar `divergencesByRuleId` em vez da lista plana de `divergences`. Extraí
  `DivergenceItem` como subcomponente para reaproveitar entre os dois modos.
- **Diff A×B (#198)**: `MappingReleaseDiffPanel.tsx` (novo) — escolhe duas releases por
  input de texto, chama `getReleasesDiff`, renderiza de forma defensiva/genérica porque o
  shape de `MappingReleaseDiff` ainda não foi confirmado via MCP/contract-qa.
- **Cobertura obrigatória**: indicador simples de `requiredCoverage.percent`/`uncovered` no
  painel de release, com aviso quando a release não tem `fiscalProfile`.

**Atualização 2026-09-15 (pós-FAIL do @lp-qa, commit `c575448`)**: `@lp-qa` validou `cc46382`
e achou (1) bug real — `MappingReleaseDiffPanel` acessava `diff.changes.length`/`.map` sem
guard, quebraria em runtime se a API devolvesse `changes` ausente/null (shape não confirmado);
corrigido com `diff.changes ?? []`. (2) Cobertura de teste insuficiente — escrevi
`MappingFiscalProfilePanel.test.tsx`, `MappingArtifactManualEditor.test.tsx`,
`MappingReleaseDiffPanel.test.tsx` (4 testes cada, incluindo o caso de shape degradado) e
estendi `MappingTestLabPanel.test.tsx` com 2 cenários (`requiredCoverage`,
`divergencesByRuleId` agrupado). 46/46 testes passando, lint/typecheck/format limpos,
`npm run build` OK.

**Ainda não feito**: validação manual clicando no `npm run dev` com dado real — não há
API/BFF rodando nem workspace/draft/release simulável nesta sessão sandboxed; só validei que
o build de produção compila sem erro. `@lp-contract-qa` ainda precisa revalidar
`resolvedXsd`/`MappingReleaseDiff` via MCP quando disponível.
