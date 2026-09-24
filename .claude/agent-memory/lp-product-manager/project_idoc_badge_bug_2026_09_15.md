---
name: project-idoc-badge-bug-2026-09-15
description: Bug #251 criada — badges sequencial/linha fixos 000000/000 para layouts IDOC/SAP na aba TXT Posicional
metadata:
  type: project
---

Issue #251 (`type: bug`, `priority: p1`, `area: frontend`) criada em
https://github.com/LayoutParser/LayoutParserReact/issues/251 e adicionada ao Project #3 com
Status `In Progress`. Nenhum item pré-existente cobria o problema (buscas por "IDOC",
"FieldDisplay", "TXT Posicional" não retornaram duplicata).

Causa raiz registrada na issue: `src/components/analysis/FieldDisplay.tsx` tem
`LINE_LENGTH = 600` hardcoded, assumindo convenção MQSeries (linha fixa 600 + sequencial
literal nas 6 primeiras posições); layouts IDOC/SAP têm linha variável por segmento sem esse
sequencial, caindo no fallback `000000`/`000`. Não é gap de contrato — a API já expõe
`LineValidationInfo.totalLength` em `ParseResponse.lineValidations`, só não é consumido nessa
renderização.

**Why:** usuário reportou visualmente (print) e a investigação técnica cruzou com nomes de
arquivo em `.claude/temp/` (TXT IDOC real + layout `LAY_MARELLI_TXT_SAP_ENVNFE_4`) sem publicar
conteúdo fiscal de terceiro na issue — só nomes de arquivo como evidência.

**How to apply:** correção já delegada e em andamento por `@lp-front-dev` em branch `fix/*`
própria, sem push. Ao concluir, mover #251 para Done exigindo evidência de PR em `develop` +
deployment `development` (e promoção a `main`/`production` se for tratado como fluxo crítico).
Não fechar por opinião — aguardar veredito de `@lp-qa`.
