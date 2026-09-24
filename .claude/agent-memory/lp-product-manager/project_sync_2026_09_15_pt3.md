---
name: project-sync-2026-09-15-pt3
description: Terceira sincronização do dia 2026-09-15 — #227/#251/#226/#228 fechados Done com evidência de produção; #198 recebeu gap de catálogo de descoberta de mappings
metadata:
  type: project
---

Sincronização confirmada via `gh` (issues, PRs, deployments) antes de qualquer mudança de status
no Project #3.

- **#227** (Task 203b — validação pré-execução no Test Lab): commit `2b84dce` confirmado ancestral
  de `origin/develop` e `origin/main`; promovido a produção há alguns dias via PR #243
  (2026-09-10T18:39:25Z), deployment produção `8aae5b3` (id 6378635390) `success`. Movido para
  `Done`. Lição: `git branch --contains` em refs locais pode enganar (local `develop` estava
  desatualizado vs `origin/develop`) — sempre checar com `git merge-base --is-ancestor` contra
  `origin/*`.
- **#251** (Bug badges IDOC/SAP): PR #252→#254, deployment produção `eab428c` (id 6463667668)
  `success` em 2026-09-15T16:36:03Z. Movido para `Done`.
- **#226** (PBI 203a — editor TCL/XSL/XSLT) e **#228** (Task 203c — diff por ruleId): entregues via
  PR #256 (`d391945` em develop) → PR #257 (`e953af4` em main), deployment produção `e953af4`
  (id 6466178132) `success` em 2026-09-15T18:55:10Z. Ambos movidos para `Done`.
- **#198** (PBI catálogo/ciclo de vida de mappings fiscais): NÃO fechado. Comentário registrado
  sobre gap identificado em teste manual de produção — falta catálogo de descoberta de mappings
  TCL/XSL/Sysmiddle por workspace; depende de endpoint novo na API (busca em
  `LayoutParser/LayoutParserApi` não encontrou equivalente). Mantido em `Ready` (não `Blocked`)
  porque o restante do escopo do PBI — MappingDefinition/MappingVersion, estados de ciclo de vida,
  publish/rollback — não depende exclusivamente desse catálogo.

Ver [[product-governance]] para taxonomia e fluxo geral.
