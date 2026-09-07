---
name: project-fiscal-gates-update-2026-09-04
description: 2026-09-04 — #201 movida para In Review (entrega parcial, resto bloqueado por contrato); #198 confirmada Blocked (nenhuma implementação, bloqueio 100% de contrato).
metadata:
  type: project
---

Registro de implementação do @lp-front-dev (commit local `a65bf62` em `develop`, não pushado)
para #201 e #198.

**#201 — Ingestão versionada do pacote de especificação fiscal.** Status: `Backlog`/`Blocked`
(triagem anterior) → **`In Review`**. Entregue: `FiscalPackageWizard`
(`src/components/mapping-studio/FiscalPackageWizard/`), rota `workspace/fiscal-package`,
consumindo o service/tipos do PR #208 (mergeado 2026-08-31, sem UI até agora). Cobre upload
multipart idempotente da revisão 1 com progresso e contexto fiscal automático (JSON). Gates
locais limpos (lint, tsc, 346 testes vitest).

Fora de escopo por falta de contrato na API (confirmado contra
`LayoutParserApi/Controllers/FiscalMappingPackagesController.cs` e
`Models/Entities/Fiscal/FiscalProject.cs`, branch `develop`): navegação/seleção de projetos
(sem endpoint de listagem), inventário normalizado de Excel/XSD (API só retorna hash/tamanho/
status de antivírus), criação de nova revisão (endpoint não existe). Comentário técnico
completo em https://github.com/LayoutParser/LayoutParserReact/issues/201#issuecomment-5542448672.

**#198 — Catálogo e ciclo de vida de mappings fiscais.** Status: `In Progress` →
**`Blocked`** (label `blocked` aplicada). Nenhuma UI foi construída — decisão deliberada de não
simular dados. `MappingGovernanceController` só expõe approve/publish/rollback por `releaseId`
já conhecido, não uma listagem. Reaproveitar `MappingArtifactDiffView` +
`src/utils/lineDiff.ts` (#203) e `MappingGovernanceReadiness` quando o contrato existir.
Pedido explícito à API: endpoint de listagem de `MappingDefinition`/`MappingVersion` com
estados de ciclo de vida. Comentário completo em
https://github.com/LayoutParser/LayoutParserReact/issues/198#issuecomment-5542452551.

**Por que isso importa:** a memória de 2026-09-03 ([[project_fiscal_gates_triage_2026_09_03]])
dizia erroneamente que #198 tinha "ciclo de vida implementado" — corrigido aqui. Nenhuma das
duas issues foi fechada; ambas seguem abertas aguardando contrato futuro da API. #201 tem parte
pronta para revisão (não é "Done" nem "In Progress" completo).

**Como aplicar:** ao reavaliar #198/#201, não tratar como pendência de esforço do front —
confirmar primeiro se `LayoutParserApi` já expõe os endpoints de listagem/revisão citados
acima. Ver também [[project_fiscal_workspaces_2026_08_31]].
