---
name: workspace-analysis-history-and-artifact-diff
description: Issues #197 (histórico de análises) e #203 (diff de artefatos) implementadas — UI para dados já expostos por services existentes.
metadata:
  type: project
---

Em 2026-09-03, implementei a UI para duas features cuja camada de dados já existia:

- **#197**: `WorkspaceAnalysisHistory` (`src/components/workspace/WorkspaceAnalysisHistory/`)
  consome `workspaceService.listAnalyses` (paginação por cursor). Não existe endpoint de listagem
  de projetos por workspace ainda, então segui o mesmo padrão do Mapping Studio
  (`MappingStudioEntry`): uma tela de entrada pede o `projectId` manualmente antes de abrir
  `/workspace/analyses/:projectId`. `listAnalyses` não tinha tratamento de erro no service — passei
  a mapear para `WorkspaceRequestError` (mesmo padrão de `getCurrentWorkspaces`), então qualquer
  outro consumidor futuro já herda esse comportamento.
- **#203**: `MappingArtifactDiffView` (`src/components/mapping-studio/MappingArtifactDiffView/`) é
  puramente apresentacional — recebe dois `MappingReleaseArtifact` prontos e renderiza diff lado a
  lado. O diff de linhas usa LCS caseiro em `src/utils/lineDiff.ts` (não havia lib de diff no
  `package.json`; decidido não puxar dependência nova para algo desse tamanho). Plugado no
  `MappingTestLabPanel` como botão "Ver diff" por artefato, que busca a release
  `previousPublishedReleaseId` (campo já existente em `MappingRelease`) sob demanda.

**Why:** ambas eram as únicas duas issues do backlog sem bloqueio externo (contrato/API) prontas
para implementação após uma triagem completa da sessão.

**How to apply:** ao adicionar telas para outros contratos "prontos mas sem UI" no workspace
fiscal, veja primeiro se `src/components/workspace/` ou `mapping-studio/` já resolveu um problema
parecido (entrada manual de ID quando falta endpoint de listagem; erro mapeado no service, não no
componente) antes de reinventar.

**Lint:** bati no mesmo problema de [[feedback_effect_setstate_lint]] — resolvido extraindo a
busca (`fetchPage`) como função pura sem `setState`, e movendo `setState` para dentro do
`.then()/.catch()/.finally()` do próprio efeito (mesmo padrão do `MappingStudioDetail`).

Commits: `f2e2efe` (#197) e `0d10972` (#203), ambos direto em `develop` — orientação explícita do
usuário nesta tarefa, embora o CLAUDE.md peça branch dedicada por padrão.

**Atualização 2026-09-07 (QA FAIL na #197):** o `WorkspaceAnalysisHistory` original não expunha
filtro nenhum, apesar de `AnalysisFilters` já suportar `documentType`. Implementei o seletor de
tipo fiscal na UI (commit `7ba6947`, direto em `develop`). Os outros três gaps do QA
(reabertura preservando layout/versão/proveniência, exclusão/expiração com auditoria,
indicador de "metadata-only") continuam **bloqueados por contrato**: confirmei em
`LayoutParserApi/Controllers/WorkspacesController.cs` que só existem `GET /api/workspaces/me`
e `GET /api/workspaces/{id}` — não há nenhum controller de análises (`analyses`) na API real.
Ou seja, mesmo o `listAnalyses` que já está em produção no front consome um endpoint que ainda
não existe no lado .NET. Antes de implementar reabertura/exclusão/metadata-only, confirme de novo
se a API já ganhou esse controller (buscar por `analyses` em `Controllers/` do repo da API).
