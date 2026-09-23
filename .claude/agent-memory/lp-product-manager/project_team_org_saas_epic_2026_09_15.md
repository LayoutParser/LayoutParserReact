---
name: project-team-org-saas-epic-2026-09-15
description: Epic #258 (Team/Organização como unidade de compartilhamento de mappings fiscais, rumo a SaaS) e PBIs #259-#262
metadata:
  type: project
---

Em 2026-09-15 o dono do produto trouxe uma direção estratégica nova: evoluir o modelo de
isolamento de "Workspace por usuário" (Epic #195) para "Team/Empresa" como unidade de
compartilhamento — usuários do mesmo time enxergam a mesma biblioteca de mappings
TCL/XSL/XSLT ao criar workspace novo, com admin de time gerenciando membership. Motivação
explícita: vender o produto como SaaS multi-tenant; isso é citado como "melhor diferencial
do produto".

Criado: Epic #258 (`type: epic`, `priority: p1`, `area: product`+`area: integration`) com
sub-issues (via addSubIssue GraphQL, não task list):

- #259 PBI (a) modelo de domínio Team/Organização + política de adesão — 100% API, prioridade
  P1, `area: integration`.
- #260 PBI (b) fluxo de admin adicionar/remover usuário do time — depende de (a), P2,
  `area: frontend`+`area: integration`.
- #261 PBI (c) workspace novo herda biblioteca de mappings do time — depende de (a), P1,
  `area: frontend`+`area: integration`.
- #262 PBI (d) migração dos workspaces fiscais existentes (dado real em produção) — depende de
  (a), P1, `area: integration`+`area: security` (maior risco: vazamento cross-team).

Todos adicionados ao Project #3 com campos nativos Tipo/Prioridade setados (não são as labels
`type:`/`priority:` — o Project #3 tem campos single-select próprios `Tipo` e `Prioridade`
além das labels do repo; setar ambos quando criar itens novos).

**Não-escopo crítico registrado no Epic:** isso NÃO remove isolamento entre
empresas/clientes diferentes (cada instalação API/Ollama por cliente continua isolada) — o
compartilhamento é só dentro do mesmo time. Comentário de link colocado no Epic #195
(issuecomment-5689829125) para não fragmentar contexto do domínio fiscal.

**Why:** decisão estratégica do dono do produto, ainda em fase de captura/planejamento — API
(LayoutParserApi) precisa modelar Team/Organização primeiro; front não implementa nada até o
contrato existir.

**How to apply:** ao refinar #259-#262, checar se LayoutParserApi já abriu issue espelho
(seguir o padrão já usado para #213/#216/API#408 — cross-repo issues). #262 é o PBI de maior
risco (dado real em produção) e deve ser o último a sair de Backlog.
