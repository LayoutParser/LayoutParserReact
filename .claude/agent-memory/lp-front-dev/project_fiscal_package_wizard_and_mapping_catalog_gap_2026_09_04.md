---
name: project-fiscal-package-wizard-and-mapping-catalog-gap
description: PBI #201 wizard implementado sobre service já existente; PBI #198 catálogo totalmente bloqueado por falta de qualquer endpoint de listagem na API.
metadata:
  type: project
---

## PBI #201 — wizard de pacote fiscal

- `mappingPackageService`/`types/mappingPackage.ts` (PR #208) existiam desde 31/08 mas **nenhum
  componente os consumia** até este trabalho. Implementado
  `src/components/mapping-studio/FiscalPackageWizard/` (form + resultado da revisão), rota
  `workspace/fiscal-package` e link em `WorkspacePage`.
- Confirmado na API (`LayoutParserApi` branch `develop`,
  `Controllers/FiscalMappingPackagesController.cs`): só existem
  `POST .../projects/{projectId}/mapping-packages` (cria pacote + revisão 1) e
  `GET .../mapping-packages/{packageId}`. `FiscalProject.cs` tem comentário explícito: "CRUD
  completo de projeto fica fora de escopo".
- **Sem endpoint de listagem de projetos** → `projectId` continua sendo colado manualmente
  (GUID), com aviso na própria tela. **Sem inventário normalizado de Excel/XSD** → a tela só
  mostra hash/tamanho/status de inspeção de antivírus por artefato, não estrutura da planilha.
  **Sem endpoint de criação de nova revisão** → não há botão de nova revisão.
- Padrão usado: `fiscalContext` (artefato obrigatório do multipart) é gerado no front como um
  `File` JSON a partir dos campos do wizard (documentType/schemaVersion/operation/jurisdiction),
  não pedido como upload separado ao usuário.

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
