---
name: project-267-pr271-closure-2026-09-16
description: Handoff dizia PR #271 aberto/bloqueado por classificador; gh confirmou já MERGED com pipeline completo até produção — #267 fechada Done, não In Review.
metadata:
  type: project
---

Em 2026-09-16 recebi um handoff pedindo para mover a Story #267 ("Mapping Studio: árvore
dupla estilo Connect-Us com regras inline") de `Ready` para `In Review`, com a premissa de que
o PR #271 estava aberto, CI verde, mas bloqueado para merge pelo classificador de segurança do
Claude Code, aguardando merge manual do usuário.

Ao verificar via `gh pr view 271`, o PR já estava **MERGED** (2026-09-16T18:19:58Z) — a premissa
do handoff estava desatualizada (o merge manual aparentemente já havia ocorrido entre o handoff
ser escrito e minha verificação).

Confirmei também via `gh api repos/.../deployments` que o pipeline completo já havia rodado:
deployment `development` (ref `develop`) sucesso às 18:34:36Z, PR #272 (`develop`→`main`)
merged às 18:36:46Z, deployment `production` (ref `main`) sucesso às 18:39:26Z.

**Why:** a regra de "fechar só com evidência de aceite e deploy quando aplicável" exige checar
o estado real via `gh` antes de agir sobre qualquer instrução de status — mesmo quando a
instrução vem de um handoff específico e detalhado. Handoffs podem ficar obsoletos entre serem
escritos e executados.

**How to apply:** sempre rodar `gh pr view`/`gh api deployments` antes de mudar status de
Project, mesmo quando o pedido já vem com "estado atual" descrito — tratar como hipótese a
confirmar, não fato. Resultado desta vez: #267 foi direto para `Done` (não `In Review`) e
fechada com comentário de evidência (PR #271 + PR #272 + deployments development/production).

Verifiquei também os demais PRs citados no pedido (#252/#255/#256/#263/#264/#268/#269/#271) —
todos MERGED, nenhum pendente, `gh pr list --state open` retornou vazio.
