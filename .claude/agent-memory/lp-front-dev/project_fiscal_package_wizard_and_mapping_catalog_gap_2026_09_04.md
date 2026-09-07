---
name: project-fiscal-package-wizard-and-mapping-catalog-gap
description: PBI #201 wizard completo (catálogo de projetos, inventário Excel/XSD e revisão incremental fechados via LayoutParserApi#309); PBI #198 catálogo de mappings segue totalmente bloqueado por falta de endpoint de listagem.
metadata:
  type: project
---

## PBI #201 — wizard de pacote fiscal (gap fechado em 2026-09-07)

- `mappingPackageService`/`types/mappingPackage.ts` (PR #208) existiam desde 31/08 mas **nenhum
  componente os consumia** até o trabalho de 2026-09-04. Implementado
  `src/components/mapping-studio/FiscalPackageWizard/` (form + resultado da revisão), rota
  `workspace/fiscal-package` e link em `WorkspacePage`.
- **2026-09-04:** confirmado na API só existiam `POST .../projects/{projectId}/mapping-packages`
  e `GET .../mapping-packages/{packageId}` — sem listagem de projetos, inventário normalizado ou
  revisão incremental. Reportado como FAIL de QA / bloqueio de contrato nos 3 pontos.
- **2026-09-07 (LayoutParserApi#309, commit `8864f8b`):** os 3 gaps foram fechados em produção.
  Front atualizado no mesmo dia para consumir:
  - `GET /api/workspaces/{workspaceId}/projects` → `mappingPackageService.listProjects`;
    `FiscalPackageWizard` agora usa `<select>` populado pelo catálogo quando disponível, com
    fallback para GUID manual só se a listagem falhar ou vier vazia.
  - `POST /api/workspaces/{workspaceId}/mapping-packages/{packageId}/revisions` →
    `mappingPackageService.createRevision`; tela de resultado ganhou o fluxo "Enviar nova
    revisão" (form próprio, sem duplicar upload da primeira revisão).
  - `GET /api/workspaces/{workspaceId}/mapping-packages/{packageId}/artifacts/{artifactId}/excel-inventory`
    → `mappingPackageService.getExcelInventory`; botão "Ver inventário da planilha" por artefato
    `spec`, mostrando `decisionSheets` (aba/colunas/quantidade de regras) e `skippedSheets`.
- Contrato registrado em `contracts/api-endpoints.json` (v6, `deliveredBy: LayoutParserApi#309`).
- Padrão usado: `fiscalContext` (artefato obrigatório do multipart) é gerado no front como um
  `File` JSON a partir dos campos do wizard (documentType/schemaVersion/operation/jurisdiction),
  não pedido como upload separado ao usuário. Isso não mudou nesta rodada.

## PBI #198 — catálogo e ciclo de vida de mappings fiscais

- **Nada implementado — bloqueio total de contrato.** Vasculhei toda a API em `develop`
  (`Controllers/*.cs`) e não existe **nenhum** endpoint de listagem: nem de
  `MappingDefinition`/`MappingVersion`, nem de releases por workspace/draft, nem de projetos.
  `MappingGovernanceController` (issue #94, Slice 7) só expõe `approve`/`publish`/`rollback` por
  `releaseId` já conhecido — governança individual, não catálogo.
- O único ponto de entrada existente para abrir um mapping é manual (GUID do draft/mapper), já
  implementado em `MappingStudioPage`/`MappingStudioEntry` desde antes desta sessão — a própria
  tela já documenta a lacuna ("catálogo navegável... ainda depende dos endpoints de listagem").
- Como **zero** critério de aceite de #198 tem endpoint de leitura para popular uma lista, não
  construí nenhuma tela nova (evitar simular catálogo sem dado real). Reportado como bloqueado
  ao invés de forçar uma implementação parcial vazia.
- Se/quando a API expuser listagem (`GET /api/workspaces/{id}/mapping-definitions` ou similar),
  reaproveitar o diff já existente (`MappingArtifactDiffView` + `src/utils/lineDiff.ts`, ver
  [[project_workspace_analysis_history_and_artifact_diff_2026_09_03]]) e o painel de governança
  (`MappingGovernanceReadiness`) em vez de recriar.
