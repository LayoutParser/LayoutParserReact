---
name: feedback-verificacao-independente-crlf
description: Nunca aceitar "isso é pré-existente/não é regressão" de outro agente sem checar HEAD vs working tree arquivo a arquivo
metadata:
  type: feedback
---

Sempre que um handoff/brief afirmar que uma falha de gate (lint/format, tipicamente CRLF neste
repo) é "pré-existente" ou "não é regressão desta feature", **verificar arquivo por arquivo**
antes de aceitar — não generalizar a partir de um exemplo (ex.: "App.tsx, nunca tocado").

**Como verificar:** comparar contagem de `\r` entre `git show HEAD:<arquivo> | grep -c $'\r'`
e o arquivo no working tree (`grep -c $'\r' <arquivo>`), e comparar com a contagem de linhas.
- Se a proporção CR/linhas já era ~100% no HEAD **e** continua ~100% no working tree → convenção
  pré-existente, o agente só continuou o padrão já quebrado (não é regressão nova).
- Se HEAD estava limpo (0 CR) e o working tree virou 100% CR → é uma regressão nova introduzida
  pelo edit desta tarefa nesse arquivo específico, mesmo que o *conteúdo* das linhas não tenha
  mudado (`git diff -b --ignore-space-at-eol` mostra 0 diff de conteúdo).

**Why:** na validação de `feat/xml-transformation-toggle` (2026-07-20), o brief recebido dizia
que a falha de lint/format por CRLF era só débito pré-existente do repo inteiro (citando
`App.tsx`, nunca tocado, como exemplo). Verificação independente mostrou que isso era verdade
para `App.tsx`, `vite.config.ts` e `LayoutParserPage.css` (100% CRLF já no HEAD) — mas **falso**
para `src/components/layout/LayoutParserPage.tsx`: HEAD tinha 0 `\r` (311 linhas limpas), o
working tree tinha 312 `\r` em 312 linhas (arquivo inteiro virou CRLF só nesta edição). Isso só
apareceu comparando HEAD vs working tree diretamente — rodar `eslint`/`prettier --check` sozinho
não distingue "debit antigo" de "regressão nova" no mesmo arquivo.

**How to apply:** todo veredito de QA que envolva CRLF (recorrente neste repo, ver
`frontend-standards.md` "Pendências conhecidas") deve rodar essa checagem HEAD-vs-working-tree
nos arquivos **editados** (não só novos) antes de aceitar a alegação de "pré-existente". Arquivos
genuinamente não tocados pela tarefa (confirmados via `git status`) podem ser tratados como fora
de escopo sem essa checagem extra.
