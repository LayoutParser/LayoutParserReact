---
name: project-pullable-sweep-2026-09-21
description: Varredura geral do board em 2026-09-21 — nenhum item Ready sem bloqueio; retrofit #288 criado
metadata:
  type: project
---

Varredura do Project 3 (LayoutParserReact — Backlog) em 2026-09-21 confirmou que **nenhum item
está Ready e livre de bloqueio agora**. Todo o épico fiscal (#195) está em In Review/In
Validation ou Blocked; nada além do já conhecido pelo usuário (#198 parte 1 Ready-mas-blocked,
#197/#201 In Review, #200/#206/#253 Blocked).

**Why:** decisão de produto trava #198/#200 (aguardando definição do catálogo/API), #206
depende do caso FIAT ponta a ponta, #253 depende de fix na LayoutParserApi.

**How to apply:** antes de sugerir "próximo item pullable" ao usuário, confirmar de novo via
`gh project item-list 3 --owner LayoutParser`, pois status muda rápido (ver
[[project-sync-2026-09-15-pt3]]). #233 (Editor visual XML estilo XMLSpy) existe como Epic sem
status/label — é visão de longo prazo do dono do produto, registrada 2026-09-08, ainda não
priorizada nem refinada; não é pullable até virar PBI com aceite.

Task retrospectiva #288 criada (type: task, p2, area: frontend) para o refinamento de UX do
Mapping Studio (commits 09b4032 + fe80786, branch feat/mapping-studio-rule-detail-panel —
detalhe de regra movido de inline para modal sob demanda na árvore). Sem status atribuído no
Project ainda (issue criada fora do fluxo de item-add automático); precisa ser adicionada ao
board manualmente ou via automação.
