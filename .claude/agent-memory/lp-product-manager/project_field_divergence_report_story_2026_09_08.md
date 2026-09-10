---
name: project-field-divergence-report-story-2026-09-08
description: PBI #232 convertida com Story filha #234 (reportar divergência de campo na árvore XML), bloqueada por contrato cruzado com a API
metadata:
  type: project
---

PBI #232 ("Chat de correção: usuário reporta divergência de campo na transformação exibida")
recebeu desenho de UX fechado pela Nina (`@lp-ui-ux`): formulário estruturado por campo (não chat
livre), gatilho inline "Reportar divergência" por nó no `XmlTree`, reaproveitando
`components/shared/Modal`.

#232 foi ajustada com labels `type: pbi`, `area: frontend`, `area: ux`, `priority: p2` e mantida
como PBI guarda-chuva. Story filha criada: **#234** — "[Story] Reportar divergência de campo por
nó na árvore XML (formulário estruturado)", com Given/When/Then cobrindo: gatilho condicionado a
`activeCandidate`, formulário pré-preenchido (xpath/valor observado/candidato via
`useTransformationStore`), validação obrigatória de `expectedValue`, submissão como pendente
local com `role="status"`, indicador visual distinto do vermelho de erro de validação, reabrir nó
edita em vez de duplicar, e acessibilidade completa por teclado (focus trap, aria-describedby).

**Why:** o dono do produto quer aproveitar a visualização lado a lado Sysmiddle/TCL-XSLT já
existente para capturar sinal de correção humano, alimentando o `RepairOrchestrator` da API no
futuro (LayoutParserApi#151, ADR de convergência TCL/XSLT de 2026-09-08).

**How to apply:** #234 está com label `blocked` — código só começa depois de um pedido de
contrato cruzado com a LayoutParserApi (mesmo padrão de [[project_fiscal_workspaces_2026_08_31]]
usado em #198/#201), cobrindo `documentId` estável, autenticação de autor e endpoint de escrita
para o payload proposto (`fieldPath`, `observedValue`, `expectedValue`, `justification`,
`candidateId`, `pathway`, `correlationId`, `layoutGuid`). Esse pedido de contrato ainda **não foi
aberto** — é o próximo passo antes de mover #234 para `Ready`. Não confundir com bug/gate: é
Story nova de feature, sem código implementado ainda.
