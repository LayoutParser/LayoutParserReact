---
name: project-logout-415-and-refresh-layout-gate-2026-08-13
description: Validação de 2 commits em codex/feat-sap-idoc-hierarchy (PR #108) — fix logout 415 e gate admin no botão Atualizar Layout
metadata:
  type: project
---

Branch `codex/feat-sap-idoc-hierarchy` (PR #108 → develop), 2026-08-13. Dois commits validados,
ambos PASS:

- `e5c6a68` fix: stop logout from failing with 415 — trocou `<form method="post" action="/auth/logout">`
  nativo (sempre `application/x-www-form-urlencoded`, sem parser registrado → 415) por
  `sessionService.logout()` via fetch sem body/Content-Type em `MainLayout.tsx`, mais
  `app.addContentTypeParser('application/x-www-form-urlencoded', ...)` silencioso no BFF como
  defesa em profundidade (nenhuma rota lê esse content-type hoje).
- `a517863` fix: gate "Atualizar Layout" a admins e buscas concluídas — antes visível/habilitado
  para qualquer usuário logado desde o início (rota `/api/layoutdatabase/refresh-cache` é admin
  no BFF, `DEFAULT_ADMIN_PATHS`); agora só renderiza com `isAdmin` e fica `disabled` até
  `allLayouts.length > 0`.

Gate completo (`npm run quality`, `cd server && npm run test`, `npm run test:e2e`,
`git diff --check`) passou 100% antes de qualquer teste novo. e2e (12/12, chromium + mobile-chromium)
sem flake desta vez — nenhum spec cobria logout/gate admin especificamente, então adicionei:
`src/layouts/MainLayout.test.tsx` (fetch de logout chama `sessionService.logout()`, navega para
`/` mesmo em falha de rede) e 2 testes em `LayoutParserPage.test.tsx` (botão ausente sem admin,
desabilitado até busca bem-sucedida com admin). Server já tinha teste de regressão para o 415
(`server/test/app.test.ts`, POST urlencoded vazio → 303, não 415).

**Why:** nenhum e2e existente exercitava esses dois fluxos, então a garantia de regressão
dependia só de leitura de código sem os testes novos.
**How to apply:** ao validar fixes pontuais de UI/BFF sem cobertura prévia, verificar se há
teste automatizado que pegaria a regressão — se não houver, escrever um teste focado antes de
dar PASS, em vez de confiar só em leitura manual do diff.
