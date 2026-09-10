---
name: project_field_correction_curation_2026_09_10
description: #232/#234 entraram no Project #3, #234 desbloqueada (LayoutParserApi#345 em produção) e nova Story #244 de curadoria de correção de campo criada Ready.
metadata:
  type: project
---

Em 2026-09-10, três ações de sincronização do backlog de correção de campo:

1. **#232** ([PBI] Chat de correção — divergência de campo) e **#234** ([Story] Reportar
   divergência por nó na árvore XML) foram adicionadas ao Project #3
   (`LayoutParserReact — Backlog`, https://github.com/orgs/LayoutParser/projects/3). Antes
   existiam só como issues soltas no repo, sem item no board.
   - #232: Status `Backlog`, Tipo `PBI`, Prioridade `P2` (mantém posição de container até
     refino adicional).
   - #234: Status `Ready`, Tipo `Story`, Prioridade `P2`.

2. **Label `blocked` removida de #234.** Os comentários da própria issue (2026-09-08) já
   confirmavam que `DocumentId` e `POST /field-correction` (LayoutParserApi#345) foram para
   produção — a implementação pode seguir de ponta a ponta. Comentário registrado em #234
   explicando a remoção.

3. **Nova Story #244** — "[Story] Curadoria de correções de campo: revisar e decidir
   aceitar/rejeitar antes do dataset de treino" — cobre o fluxo do **curador/revisor**
   (persona distinta do analista fiscal de #232/#234) contra os endpoints confirmados em
   produção em 2026-09-10 pela API:
   - `GET /api/transformation/field-correction/pending`
   - `POST /api/transformation/field-correction/{reportId}/review` (body `{decision:
     "accepted"|"rejected"}`, idempotente; só `reviewed_accepted` alimenta o dataset de
     treino de IA).
   Sem bloqueio de contrato — foi direto para `Ready` (Tipo `Story`, Prioridade `P2`,
   `area: frontend`) no Project #3, item `PVTI_lADODnBfYs4BgM9hzg6Zk4s`.

**Por quê:** consolidar o board como fonte de verdade — issues existentes sem item no Project
quebram rastreabilidade de sprint/roadmap; label `blocked` desatualizada esconde trabalho
pronto para iniciar; a curadoria é um fluxo de produto novo (persona diferente) que não deve
ser confundido com o report do analista.

**Como aplicar:** ao tocar #232/#234/#244 no futuro, tratar #244 como complementar (não
duplicado) — fluxo de curador vs. fluxo de report do analista. Se #244 crescer (ex.: exigir
tela própria de auditoria/histórico de decisões), considerar promovê-la a PBI com sub-Stories,
seguindo o padrão já usado em [[project_203_epic_breakdown_2026_09_07]].
