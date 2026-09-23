---
name: project-sync-2026-09-15-pt2
description: /product-sync de 2026-09-15 (segunda rodada) — #251 e fiscal contract PR #255 mergeados+deployados em development, ainda sem promoção main/produção; #253 segue Blocked com investigação atualizada.
metadata:
  type: project
---

`/product-sync` executado em 2026-09-15 (rodada da tarde), cobrindo o bug IDOC/SAP, o login
loop e o contrato fiscal #198/#226/#228. Continuação de [[project_sync_2026_09_15]].

## Verificado no GitHub (não apenas relatado)

- **PR #252** (`fix/idoc-variable-line-length` → `develop`): **MERGED** em
  2026-09-15T14:03:46Z. Todos os checks SUCCESS, incluindo `CI e Deploy Dev` (deploy em
  **development** confirmado). Sem evidência de promoção `develop → main` nem deploy em
  `production` ainda.
- **PR #255** (`feat/fiscal-profile-manual-edit-diff-contract` → `develop`): **MERGED** em
  2026-09-15T16:26:45Z. Mesmo padrão: checks SUCCESS + `CI e Deploy Dev` bem-sucedido em
  development; sem promoção a main/produção.
- **Issue #253**: continua `OPEN`, sem PR associado (é investigação, não correção de código).

## Ações tomadas no Project #3

- **#251** (item `PVTI_lADODnBfYs4BgM9hzg7DaNg`): Status `In Progress` → **`In Validation`**
  (merge+deploy dev confirmados, mas falta promoção a main/produção para fechar como Done —
  regra de "fluxo crítico" da definição de concluído do CLAUDE.md).
- **#228** (item `PVTI_lADODnBfYs4BgM9hzg51lSM`, Task "203c — Diff granular por ruleId"):
  Status `Ready` → **`In Progress`** (camada de tipos+services do contrato já implementada via
  PR #255; falta UI).
- **#198** e **#226** (PBIs mais amplos que #228): mantidos em `Ready` — só uma fração
  (contrato de 1 dos endpoints relacionados) foi entregue, ainda não justifica mover o PBI
  inteiro.
- **#253**: mantido `Blocked` — nenhuma correção de código, apenas investigação.

## Comentários de evidência adicionados

- #251, #253, #198, #226, #228 — cada um com resumo do que foi feito, links de PR/commit,
  e o que falta (ver corpo dos comentários no GitHub, não duplicado aqui).
- #253 em particular documenta que as hipóteses de allowlist de tenant e de necessidade de
  provisionamento prévio foram **descartadas** pela própria API; hipótese atual é
  loopback BFF→API (`TrustIdentityFromLoopbackOnly`) ou headers de identidade vazios ou
  exceção fail-closed — não confirmado ao vivo em produção nesta sessão (sem SSH
  credenciado). CorrelationId de reprodução repassado à API:
  `07e5f113-441f-49c2-ac42-4ee13365738a` (`2026-09-15T13:47:20.288Z`).

## Pendência registrada

- Contrato fiscal: 2 shapes (`ResolvedXsdReference`, `MappingReleaseDiff*`) não confirmados
  contra o MCP da API — ficou indisponível (`CONNECTION_CLOSED`) durante a sessão. Fica como
  pendência para `@lp-contract-qa` revalidar quando o MCP voltar.

## Regra reforçada

Merge em `develop` + `CI e Deploy Dev` com sucesso é evidência de deploy em **development**,
não em produção — não confundir os dois ao decidir `In Validation` vs `Done`. Só mover para
`Done` quando houver PR/deployment record confirmando promoção `develop → main` e deploy em
`production` (ver exemplo correto em [[project_sync_2026_09_15]], PR #245 + deployment
production `5d1a78b4`).
