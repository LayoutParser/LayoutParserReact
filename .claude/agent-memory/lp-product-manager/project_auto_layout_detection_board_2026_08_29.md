---
name: project-auto-layout-detection-board
description: Rastreabilidade da iniciativa de detecção automática nos Projects do front e da API.
type: project
date: 2026-08-29
---

# Iniciativa — detecção automática de layout

Project canônico do front: `LayoutParserReact — Backlog` #3.

- #177 Epic — Upload inteligente com detecção automática de layout (`In Progress`, P1).
- #178 PBI — Identificar automaticamente layouts MQSeries e IDoc (`In Progress`, P1).
- #179 Task P0 — contrato/fingerprint na API (implementado em branch; aguardando PR).
- #180 Story — anexar somente o documento (implementado em branch; aguardando PR).
- #181 Task — consumir parse automático (implementado em branch; aguardando PR).
- #182 Task — UX `unique|ambiguous|not_found` (implementado em branch; aguardando PR).
- #183 Gate P0 — zero falsa auto-seleção (PASS local com MQSeries e IDoc reais).
- #184 Task — tool MCP `detect_layout` (evolução separada, ainda pendente).
- #185 Task — documentação e handoff (atualizados na mesma branch).

Project da API: `LayoutParserApi — Backlog` #2.

- LayoutParserApi #213 — contrato e endpoint implementados em branch; aguardando PR.
- #214 — fingerprint/matriz de colisão implementados e documentados.
- #215 — gate local aprovado: 432 testes + fixtures reais MQSeries/IDoc.
- #216 — tool MCP `detect_layout` ainda pendente (`lp-devops`).

Relações nativas de sub-issue no front: #177 contém #178/#185; #178 contém #179/#180/#183/#184;
#180 contém #181/#182. Na API, #213 contém #214/#215/#216. Comentários cruzados ligam #179 à
API #213.

Marco coordenado `Detecção automática de layout — MQSeries e IDoc`: número 3 no front e número 1
na API, sem data artificial. Ordem operacional: #214 → #213 → #215 → front #179/#181/#182/#183 →
#216/#184.

Decisão de produto: garantir 100% de precisão nas auto-seleções, não 100% de cobertura universal.
Somente prova única permite seleção; colisões permanecem ambíguas.

Refinamento entregue: `ambiguous` apresenta até cinco layouts compatíveis ordenados por score
explicável da API. O front não recalcula o score, não pré-seleciona o primeiro e envia a decisão do
usuário como override manual auditável. A entrega permanece dentro da mesma Epic/PBI.
