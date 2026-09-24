---
name: project-sync-2026-09-15
description: /product-sync de 2026-09-15 — confirma Status Done no board para #237-241/#232/#234/#244 e fecha #236 como duplicata órfã.
metadata:
  type: project
---

`/product-sync` (modo sync) executado em 2026-09-15 após o fechamento do PBI "Gerar documento
de exemplo" (ver [[project_sample_document_closure_2026_09_15]]).

## Verificado

- Project item-list (LayoutParserReact — Backlog, project 3) confirma campo **Status = "Done"**
  (não só issue closed) para #237, #238, #239, #240, #241, #232, #234, #244 — board consistente
  com o GitHub Issues.
- PR #245 ("Develop") mergeado 2026-09-15T11:20:34Z e deployment `production` criado
  2026-09-15T11:20:37Z (sha `5d1a78b4`) — evidência de que o trabalho fechado está de fato em
  produção, satisfazendo a definição de concluído para fluxo crítico.

## Divergência encontrada e corrigida

- **#236** "[PBI] Botão 'Gerar documento de exemplo' na tela de layout" estava **aberta e fora
  do Project** — era o pedido original do dono do produto (2026-09-09) que originou #237-#241,
  mas nunca foi fechada/linkada como duplicata depois que #237 assumiu o rastreamento real.
  Fechada em 2026-09-15 com comentário apontando #237-#241, PR #245 e o deployment de produção
  como evidência. `reason: not planned` (duplicata, não é trabalho descartado por falta de
  valor).

## Sem mudança

- Fiscal Platform (#195-#206, #226-#229) — nenhum commit recente toca essa área; status do
  board (In Progress/In Review/In Validation/Blocked/None) permanece conforme
  [[project_backend_status_sync_2026_09_07]] e [[project_203_epic_breakdown_2026_09_07]]. Não
  reavaliado a fundo neste sync (fora do escopo do trabalho recente).
- #233 "[EPIC] Editor visual de XML estilo XMLSpy" — aberta, sem status no Project; não
  relacionada aos commits recentes (field-correction-curation, divergência de campo). Não
  mexida.
- #226-#229 (203a-d) continuam com Status "None" no Project (issue aberta mas sem coluna) — já
  registrado como divergência conhecida em memória anterior; não é causado por este sync e não
  havia evidência nova para agir.

## Regra reforçada

Ao capturar um PBI a partir de "pedido do dono do produto", sempre checar se já existe issue
duplicada equivalente antes de criar uma nova numerada subsequente — e, ao fechar a nova,
lembrar de fechar/linkar a original para não deixar órfã fora do Project.
