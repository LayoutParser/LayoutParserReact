---
name: project-generate-sample-document
description: PBI #237 + Stories #238-#241 (gerar documento de exemplo a partir de layout mapeado), bloqueadas por LayoutParserApi#355/#356
metadata:
  type: project
---

Feature "Gerar documento de exemplo" na tela de layout formalizada no Project #3
(LayoutParserReact — Backlog) em 2026-09-09.

- PBI #237 — botão condicional a mapper vinculado, com contrato de referência
  `POST /api/layouts/{layoutGuid}/generate-sample` (mock primeiro, real depois).
- Story #238 — botão só habilita quando layout já tem mapeador (TCL/XSL/XSLT).
- Story #239 — tratamento amigável de 404 (sem mapper) e 400 (layoutGuid desconhecido).
- Story #240 — mensagem "ainda não disponível" para layout Xml, sem crash; marcada `blocked`
  para o cenário de endpoint real.
- Story #241 — integração mockada primeiro, troca para API real depois, sem retrabalho de UI.

**Why:** contexto veio via handoff cross-repo do LayoutParserApi (não pedido direto do
usuário no front). API autorizou início de desenho de UI/mock antes do endpoint real existir.
Geração é 100% determinística por regra no lado API (sem IA); front só consome.

**Dependência externa (não é item nosso, não fechar por nós):**
- LayoutParserApi#355 (cobertura TextPositional) — em implementação, ainda não em produção.
- LayoutParserApi#356 (cobertura Xml) — não iniciado, depende de #355.
- ADR: `docs/architecture/adr-geracao-documento-exemplo-2026-09-09.md` no repo LayoutParserApi.

**How to apply:** não fechar #237/#238/#239/#241 como "Done" completo antes de #355 estar em
produção e a troca mock→real ser feita (ver critério de aceite do PBI). #240 permanece
`blocked` para o cenário de endpoint real até LayoutParserApi#356 avançar; o mock em si pode
ser implementado e fechado como "mock completo" sem essa dependência. Ao sincronizar/triage
futuro, checar status de LayoutParserApi#355/#356 antes de reclassificar essas issues.
Relacionado: [[product-governance]].
