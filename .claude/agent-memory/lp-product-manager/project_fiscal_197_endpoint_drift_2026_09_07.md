---
name: project-fiscal-197-endpoint-drift-2026-09-07
description: Issue #197 reclassificada para Blocked por DRIFT de contrato confirmado (endpoint inexistente na API)
metadata:
  type: project
---

Issue #197 (PBI — histórico seguro de análises fiscais por workspace, LayoutParserReact) foi
reclassificada de "gap de escopo do front em revisão" para **bloqueio por dependência
cross-repo, severidade alta**, e movida no Project (#3) de `In Review` para `Blocked`.

Motivo: `@lp-contract-qa` confirmou DRIFT real — `src/services/api/workspaceService.ts`
(`listAnalyses`) chama `GET /api/workspaces/{workspaceId}/projects/{projectId}/analyses`, que
não existe em nenhum controller da LayoutParserApi (sem `ProjectsController` nem rota
equivalente). A chamada já está em produção; risco de 404 silencioso e tela de histórico
fiscal não listando dados reais para usuários agora.

**Why:** superava a classificação anterior (ver [[project_fiscal_gates_update_2026_09_04]]),
que tratava a lacuna como falta de escopo implementado no front. O achado do contract-qa muda
a causa raiz para contrato ausente na API, não trabalho pendente do front.

Estado ao reclassificar: filtro por tipo de documento fiscal já implementado e correto
(commit local `7ba6947`, sem push) — não depende do endpoint quebrado para essa parte.
Reabertura, exclusão/expiração e indicador metadata-only continuam fora de escopo até
existir contrato. `priority: p0` mantida (já estava setada).

**How to apply:** não reabrir #197 para revisão do front até o endpoint
`GET /api/workspaces/{workspaceId}/projects/{projectId}/analyses` ser criado/contratado na
LayoutParserApi. Dependência pertence à equipe da API — não é resolvida por trabalho neste
repositório. Ao sincronizar status futuro, verificar primeiro se o endpoint passou a existir
antes de assumir que o bloqueio segue válido.
