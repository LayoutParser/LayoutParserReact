---
name: project_203_epic_breakdown_2026_09_07
description: #203 virou Epic guarda-chuva com sub-issues 203a-e após FAIL de QA no diff de artefatos TCL/XSL/XSLT.
metadata:
  type: project
---

#203 ("[PBI] Autoria e diff seguro de TCL/XSL/XSLT") recebeu FAIL de QA: o commit `8cff185`
(diff textual read-only vinculado a `sourceRuleIds` agregados por release) cobre só uma fração
pequena dos critérios de aceite originais. Reclassificada `type: epic` (era `type: pbi`).

**Why:** `@lp-front-dev` avaliou o escopo restante e recomendou quebrar em sub-entregas
menores e independentemente verificáveis, cada uma com dependência explícita em vez de manter
um PBI monolítico que mistura trabalho bloqueado por API com trabalho que pode avançar hoje.

Sub-issues criadas (todas no milestone "P0 — Plataforma Fiscal e Workspaces", Project 3):

- #225 — 203e Imutabilidade de release publicada (`type: task`, p1). Sem dependência de API,
  prioridade 1 (barata, fecha critério real hoje).
- #226 — 203a Editor de TCL/XSL/XSLT com RBAC (`type: pbi`, p1). BLOQUEADO até API expor
  endpoint de mutação de artefato + RBAC (LayoutParserApi#94/#103). Prioridade 2 (big rock).
- #227 — 203b Validação sintática/estática pré-execução no Test Lab (`type: task`, p2).
  Paralelo a #226.
- #228 — 203c Diff granular por regra/ruleId (`type: task`, p2). Fatia parcial já entregue em
  `8cff185`; falta granularidade linha-a-linha; depende de expansão de contrato da API.
- #229 — 203d Fluxo de revisão a partir de edição manual + gate de regressão obrigatória
  (`type: pbi`, p2). Bloqueado por #226 (precisa do editor existir primeiro).

**How to apply:** #203 só fecha quando todas as sub-issues (#225–#229) fecharem com evidência.
Ao sincronizar status do Epic #195 (plataforma fiscal), tratar #203 como container, não como
item de trabalho isolado. Relacionar com [[project_fiscal_workspaces_2026_08_31]] e
[[project_fiscal_197_endpoint_drift_2026_09_07]] para o padrão de dependência cross-repo na API.
