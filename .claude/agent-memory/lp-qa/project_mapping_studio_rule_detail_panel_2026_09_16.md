---
name: project_mapping_studio_rule_detail_panel_2026_09_16
description: Veredito PASS para o botão "Ver regra" (modal de detalhe DSL) na árvore dupla do Mapping Studio, commit 09b4032.
metadata:
  type: project
---

Branch `feat/mapping-studio-rule-detail-panel`, commit `09b4032` (a partir de `origin/develop`
`32d7b36`). `@lp-front-dev` substituiu a seção sempre-visível "Lista de regras (detalhe)" por um
botão "Ver regra" na toolbar de `MappingLayoutTreeView.tsx`, que abre `Modal` com
`humanDescription` + `technicalDetail` em `<pre><code>` (`white-space: pre-wrap` no CSS).

**Veredito: PASS.**

- `npm run quality` completo (lint, typecheck, test:coverage, build dev/prod, contract:check,
  format:check) — exit code 0. `git diff --check` limpo no escopo do componente.
- Botão "Ver regra" cobre os 3 casos de desabilitado (sem seleção, nó sem regra vinculada,
  `explanationRules` não carregado) + caso habilitado, todos com teste próprio em
  `MappingLayoutTreeView.test.tsx` — não é só "passa", cada cenário é isolado.
- Teste de abertura do modal confirma `technicalDetail` com `\n` preservado via
  `codeBlock.textContent` (case real de DSL if/else que motivou o pedido); CSS confirma
  `white-space: pre-wrap` na classe `.mapping-layout-tree-rule-detail-code`.
- Sem código morto: `ExplanationRuleCard`/`supportLabels` não existem em nenhum lugar do
  `src/` (grep vazio); `MappingStudioPage.tsx` não tem import quebrado, segue passando
  `explanationRules={explanation.rules}` para o componente.
- `npm run test:e2e` NÃO foi rodado (job separado na CI, fora do escopo de `npm run quality`
  per CLAUDE.md) — sem sinal de que fluxo crítico exigisse e2e novo aqui (é refino de UI dentro
  de componente já coberto).
