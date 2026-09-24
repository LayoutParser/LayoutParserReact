---
name: project-196-201-api-delivery-sync-2026-09-22
description: #196 fechado (Done) e #201 desbloqueado para Ready após entregas da LayoutParserApi (PR #470 e #468)
metadata:
  type: project
---

Em 2026-09-22, a equipe da LayoutParserApi confirmou duas entregas relevantes ao board do
LayoutParserReact (Project 3):

- **#196** (identidade/workspace, PBI): idempotência de `GET /api/workspaces/me` sob
  concorrência PASS (8 rodadas x 30 chamadas paralelas). Bug real de isolamento cross-workspace
  encontrado e corrigido — POST de criação de draft aceitava `packageId`/`revisionId` de outro
  workspace, vazando conteúdo via sugestão de regras. Corrigido em **LayoutParserApi#470**,
  produção desde 2026-09-22, sem impacto em drafts existentes. Movido `In Validation` → `Done`
  (não havia entrega pendente do front, era validação de comportamento da API). Comentário com
  evidência: https://github.com/LayoutParser/LayoutParserReact/issues/196#issuecomment-5780136540

- **#201** (pacote fiscal, PBI): primeira entrega de `qualitySignals`/`checksRun`
  (`missingRequiredColumns`, `skippedSheets`, `emptySheets`) via **LayoutParserApi#424**,
  produção desde 2026-09-22 (PR #468). Ressalva: `missingRequiredColumns` fica **inerte** até
  existir lista de colunas obrigatórias configurada no domínio fiscal — nunca aparece em
  `checksRun` até lá. Movido `Blocked` → `Ready` (não `Done`): consumo do contrato na UI do
  FiscalPackageWizard ainda não implementado, e outros critérios de aceite do PBI (upload por
  artefato, revisão com hash/versão, versionamento silencioso) seguem pendentes. Fica com
  `@lp-front-dev`. Comentário:
  https://github.com/LayoutParser/LayoutParserReact/issues/201#issuecomment-5780136861

**Why:** boas notícias da API não implicam fechamento automático — verificar se resta trabalho
de consumo no front antes de mover para `Done`.

**How to apply:** ao receber "API entregou X" para um PBI do front, checar checklist de aceite
completo antes de decidir entre `Ready`/`In Review`/`Done`; só fechar quando não houver
trabalho de UI pendente.
