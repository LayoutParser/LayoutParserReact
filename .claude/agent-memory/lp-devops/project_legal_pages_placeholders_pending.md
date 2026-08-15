---
name: legal-pages-placeholders-pending
description: /terms e /privacy foram publicados (PR #111) com e-mail de contato e jurisdição como placeholder visível — pendem de decisão da empresa antes de exposição externa
metadata:
  type: project
---

As páginas públicas `/terms` e `/privacy` (PR #111, 2026-08-15) foram deliberadamente entregues
com lacunas marcadas em `<span className="legal-placeholder">` — hoje `[e-mail de contato]` e a
jurisdição nos Termos. Não são esquecimento nem TODO de código: são campos que dependem de
decisão de negócio/jurídico da NDD.

**Why:** inventar um e-mail de contato ou uma comarca num documento legal público é pior do que
exibir a lacuna — cria compromisso que a empresa não assumiu. O LayoutParser é ferramenta
interna, então o custo de exibir o placeholder é baixo enquanto o acesso é interno.

**How to apply:** antes de qualquer promoção a `main`/deploy que amplie o alcance dessas páginas
(ou se alguém pedir "publicar a home"), sinalizar que esses placeholders continuam lá e pedir os
valores ao usuário — não preencher por conta própria. Um `grep -rn "legal-placeholder"
src/components/marketing/` dá a lista atual. Ver [[project_quality_pipeline_2026_08_10]] para o
fluxo de promoção.
