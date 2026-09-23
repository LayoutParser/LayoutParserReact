---
name: mapping-studio-rule-detail-panel
description: UX rework of Story #267 tree — rule list moved from always-visible cards to on-demand modal triggered from tree toolbar
metadata:
  type: project
---

Reworked the mapping tree UX in `MappingLayoutTreeView.tsx` + `MappingStudioPage.tsx`
(both under `src/components/mapping-studio/`) on 2026-09-16, branch
`feat/mapping-studio-rule-detail-panel` (from `origin/develop`, commit `09b4032`, not pushed).

**Why:** product owner saw the shipped Story #267 double-tree screen and found the
always-visible "Lista de regras (detalhe)" section (rendering ALL `explanation.rules` via
`ExplanationRuleCard`) unusable for rules with conditional/DSL logic, and unnecessary to show
upfront for every rule.

**What changed:**

- Removed the always-visible rule list section and `ExplanationRuleCard` from
  `MappingStudioPage.tsx`.
- Added a `explanationRules?: MappingRuleExplanation[]` optional prop to
  `MappingLayoutTreeView` (optional so callers without the explanation loaded degrade
  gracefully — button just stays disabled).
- Added a "Ver regra" toolbar button next to Expandir/Recolher tudo, enabled only when the
  selected node's `LayoutTreeRuleLink[]` (already used for the cross-highlight/badges) has at
  least one entry whose `ruleId` also exists in `explanationRules` (cross-referenced via a
  `Map<ruleId, MappingRuleExplanation>`).
- Clicking opens `components/shared/Modal` (reused, not modified) showing
  `humanDescription` + `technicalDetail` in a `<pre><code>` block
  (`.mapping-layout-tree-rule-detail-code`, `white-space: pre-wrap`) to preserve DSL
  if/else line breaks.

**How to apply:** if [[mapping-studio-connect-us-tree]] or the fiscal mapping UI gets touched
again, the rule detail is now sourced this way — don't reintroduce an always-visible rule
list. `ruleId` correlation between `LayoutTreeResponse.rules[]` and
`MappingExplanation.rules[]` is the pattern already used for badges/highlighting; reuse it
rather than inventing a new join.

Gates run: `npm run lint`, `npm run typecheck`, `npm run format:check` (clean on touched
files — pre-existing unrelated `.claude/agent-memory/*.md` format warnings not caused by this
change), and `npx vitest run src/components/mapping-studio` (65/65 passed, including 8 new
tests for the button/modal states: disabled without selection, disabled on rule-less node,
disabled when explanation not loaded, enabled+content on rule match, close via button and Esc).
`npm run test:e2e` / full `npm run quality` not run (not requested, no time budget signal).
