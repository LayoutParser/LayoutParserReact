---
name: project-mapping-release-catalog-wired-2026-09-07
description: Issue #198 (catálogo de mapping releases) conectado ao front após LayoutParserApi#307 entregar GET /api/workspaces/{id}/mapping-releases.
metadata:
  type: project
---

Em 2026-09-07 a API confirmou (LayoutParserApi#307) `GET /api/workspaces/{workspaceId}/mapping-releases`
(paginado, `page`/`pageSize`, resposta `{ items, page, pageSize, totalCount }`) no
`MappingGovernanceController`. O DTO de item (`ToReleaseResponse`) é um resumo — sem
artefatos, diagnósticos de compilação ou `testRunSummary` — só o GET de detalhe
(`getRelease`) traz isso.

**Why:** antes disso o [[project_fiscal_package_wizard_and_mapping_catalog_gap_2026_09_04]]
registrava #198 como "bloqueio total, nenhum endpoint de listagem" — esse gap está fechado.

**How to apply:** o front consome via `mappingReleaseService.listReleases(workspaceId, page?,
pageSize?)` (`src/services/api/mappingReleaseService.ts`), tipado em
`MappingReleaseSummary`/`MappingReleaseListResponse` (`src/types/mappingRelease.ts`). A UI
mora em `MappingReleaseCatalog` dentro de `MappingStudioEntry`
(`src/components/mapping-studio/MappingStudioPage.tsx`) — lista releases do workspace ativo
como links para `/workspace/mapping-studio/{draftId}/draft`, ao lado do formulário manual de
identificador (mantido como fallback, já que mappers Sysmiddle publicados ainda não têm
catálogo). Contrato registrado em `contracts/api-endpoints.json` como
`GET /api/workspaces/:param/mapping-releases` (`LayoutParserApi#307`).
