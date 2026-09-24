---
name: project-login-loop-api-issue-2026-09-15
description: Issue cross-repo criada na LayoutParserApi para o Bug #253 (login loop) e comentário de evidência no epic #368.
metadata:
  type: project
---

Criada LayoutParserApi#408 documentando o estado da investigação do
[[project_login_loop_consumers_tenant_2026_09_15]] (#253): sintoma, 2 hipóteses já descartadas
pela API (allowlist de tenant, provisionamento prévio), 3 cenários levantados por eles (loopback
BFF→API via `TrustIdentityFromLoopbackOnly`, headers de identidade vazios, exceção SQL engolida
por fail-closed em `IdentityWorkspaceService`), correlationId `07e5f113-441f-49c2-ac42-4ee13365738a`
(`2026-09-15T13:47:20.288Z`) e indício não confirmado ao vivo sobre
`LAYOUTPARSER_API_URL=http://127.0.0.1:5000`. Comentário cruzado em #253 linkando #408.

Também comentado em LayoutParserApi#368 (epic do gate #200) com evidência de que API#379/#381/
#367/#380 (todos CLOSED) cobrem perfil fiscal, editor manual TCL/XSL/XSLT, diff por ruleId e
diff A×B — consumidos hoje no front via commits `e7f2b1b`/`cc46382`/`c575448` em
`feat/fiscal-mapping-studio-ui`. Não fechei #368 (fora do meu escopo em outro repo); deixei a
decisão de status para o dono. `MappingExplanation`/histórico de análises (API#366) segue em
aberto e não coberto por essa entrega.

**Why:** manter dependência cross-repo #253↔API#408 explícita e rastreável, e não deixar epic
de outro repo desatualizado quando há evidência concreta de entrega do lado dele.

**How to apply:** ao revisitar #253, checar retorno em API#408 antes de reabrir investigação
própria. Ao revisitar #200/#368, considerar #379/#381/#367/#380 como já satisfeitos; falta
apenas MappingExplanation/histórico (#366).
