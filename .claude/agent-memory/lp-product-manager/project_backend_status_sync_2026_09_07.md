---
name: project-backend-status-sync-2026-09-07
description: Sincronização de status das gates/PBIs fiscais e de detecção de layout após retorno da API sobre #188, #198, #200, #201
metadata:
  type: project
---

Em 2026-09-07 a LayoutParserApi reportou status de 4 itens do Project "LayoutParserReact —
Backlog" (org LayoutParser, project 3). Ação tomada:

- **#188** (gate parse/auto em produção): verificação local mostrou que a premissa do pedido
  estava desatualizada — o PR #189 (`develop → main`) já estava **mergeado** desde
  `2026-08-31T17:11:42Z` (commit `0b369ca6`), com `deployment` `production` confirmado para o
  mesmo commit. Junto com a API em produção desde 31/08 (LayoutParserApi#233), todos os
  critérios do gate estavam satisfeitos. Movido para `Done`. Tentativa de `gh issue close 188`
  foi **bloqueada pelo classificador de auto mode** — issue ainda está tecnicamente aberta,
  precisa de fechamento manual ou permissão explícita do usuário.
- **#198** (PBI catálogo/lifecycle de mappings fiscais): API confirmou
  `GET /api/workspaces/{workspaceId}/mapping-releases` em produção desde 05/09
  (LayoutParserApi#307). Isso resolve o bloqueio que constava como "Blocked (nada
  implementado)" em [[project_fiscal_gates_update_2026_09_04]]. Movido `Blocked → Ready`;
  aguardando @lp-front-dev implementar o consumo do endpoint.
- **#201** (PBI wizard de pacote fiscal): API confirmou os 3 gaps (listagem de projetos,
  inventário Excel/XSD, revisão incremental) em produção desde 05/09 (LayoutParserApi#309).
  Front já tem commit `a65bf62` implementando o wizard. Mantido em `In Review` — falta veredito
  de @lp-qa antes de mover a `In Validation`/`Done`.
- **#200** (gate isolamento por workspace + explicabilidade fiscal): API relatou enforcement
  server-side já ativo em produção, mas faltam (a) teste de integração cross-workspace e (b)
  ADR do contrato de explicabilidade fiscal. Comentário formal pedindo os dois itens foi postado
  na issue. Mantido `Blocked`.

**Why:** o Project é o registro operacional; qualquer retorno de status de outro repo precisa
ser verificado localmente (não aceito de forma cega) antes de mover status, pois premissas do
solicitante podem estar desatualizadas (caso #188).

**How to apply:** ao processar próximos reportes cross-repo, sempre confirmar evidência local
(PR/commit/deployment) antes de aceitar "resolvido" como fato; usar `gh api
repos/.../deployments` para checar ambiente `production`. Se `gh project item-edit` ou `gh
issue close` forem bloqueados pelo classificador de auto mode, registrar o bloqueio e reportar
ao usuário em vez de insistir ou contornar.
