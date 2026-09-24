---
name: project_fiscal_api_delivery_sync_2026_09_15
description: 2026-09-15 — API entregou 4 contratos em produção (perfil fiscal, editor de artefato, diff por ruleId, diff A×B+cobertura); #226 e #228 movidos Blocked→Ready, #198 permanece Ready com evidência ampliada, #200 permanece Blocked.
metadata:
  type: project
---

Em 2026-09-15 a LayoutParserApi reportou deploy verde em `master` cobrindo 4 frentes que
bloqueavam itens deste Project (#3) via dependência cross-repo:

1. API#379 — perfil fiscal (`PUT .../mapping-drafts/{draftId}/fiscal-profile`, `fiscalProfile`/
   `resolvedXsd` em GET de draft/release). Relevante a #198.
2. API#381 — editor de artefato TCL/XSL/XSLT (`PATCH .../artifacts/{engine}`, If-Match,
   release derivada). Resolve o bloqueio de #226.
3. API#367 — diff granular por ruleId (`divergencesByRuleId` aditivo no GET de release).
   Resolve o bloqueio de #228.
4. API#380 — diff release A×B (`GET .../releases/diff?fromReleaseId=&toReleaseId=`) +
   `requiredCoverage` no GET de release. Relevante a #198.

**Ações tomadas:**

- #226 (203a Editor TCL/XSL/XSLT com RBAC): Status `None` → `Ready` no Project. Evidência em
  https://github.com/LayoutParser/LayoutParserReact/issues/226#issuecomment-5681559355.
  Ressalva: RBAC por papel (mapper/fiscal_admin/owner) NÃO está implementado no backend para
  o PATCH de rules/compile/artifact — segue só por membership; é recomendação no ADR deles,
  não fato consumável. Front ainda precisa implementar UI do editor.
- #228 (203c diff granular por ruleId): Status `None` → `Ready`. Evidência em
  https://github.com/LayoutParser/LayoutParserReact/issues/228#issuecomment-5681559663.
  Front ainda precisa consumir `divergencesByRuleId` em `MappingArtifactDiffView`.
- #198 (PBI catálogo/ciclo de vida fiscal): mantido `Ready` (já estava, ver
  [[project_backend_status_sync_2026_09_07]]). Comentário de evidência ampliado com os dois
  contratos novos: https://github.com/LayoutParser/LayoutParserReact/issues/198#issuecomment-5681563296.
  Sugestão registrada (não executada): quebrar #198 em sub-issues como foi feito com #203,
  dado que já cobre 3 superfícies de front distintas (catálogo, perfil fiscal, diff A×B).
- #200 (gate isolamento workspace + explicabilidade fiscal): SEM MUDANÇA, continua `Blocked`.
  A entrega reportada não cobre os dois itens pendentes desse gate (teste de integração
  cross-workspace e ADR de explicabilidade fiscal) — não fazia parte das 4 frentes reportadas.
- Não existem issues próprias para "#198.2b"/"#198.3"/"#198.5" — são referências informais a
  fatias dentro do PBI #198 monolítico, não sub-issues rastreáveis. Não foram criadas
  especulativamente; ficou como sugestão de refinamento no comentário de #198.
- Nenhum item foi fechado: em todos os casos "API pronta" != "front consumiu". #225 (única
  sub-issue de #203 já `Done`) não foi tocada — não fazia parte da leva reportada.

**Ambiguidade não resolvida:** a API pediu update de Swagger/README "ao @lp-doc" — não ficou
claro se é o `@lp-doc` deles (repo API) ou o nosso (repo React). Registrado como pendência de
esclarecimento, nenhuma ação tomada de nosso lado sobre isso.

**Why:** consistente com [[project_203_epic_breakdown_2026_09_07]] e
[[project_backend_status_sync_2026_09_07]] — dependência de API resolvida move o item para
`Ready`/desbloqueado, nunca direto para `Done`; fechamento exige evidência de consumo do front.

**How to apply:** ao delegar a `@lp-front-dev`, priorizar #226 e #228 (contratos prontos,
sem gap conhecido) sobre #198 (ainda tem debate de granularidade em aberto) e não tocar #200
até a API entregar o teste cross-workspace + ADR.
