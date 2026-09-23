---
name: project-197-and-201-revalidation
description: Revalidação do #197 (gaps fechados via PR #289/#291, merged em develop) e #201 (critérios parciais confirmados, código já no working tree)
metadata:
  type: project
---

**#197** — PR #289 (`feat/wire-workspace-id-upload-flow`, commit `5a2f6e7`) e PR #291
(`feat/analysis-archive-filters-reopen`, commit `89c7bfd`) ambos MERGED em `origin/develop`
(mergeCommits `ad0d5a1`, `8308781`), todos os checks de CI verdes (Quality Gates, CodeQL,
Dependency Review). Confirmei em código (não só CI): `LayoutParserPage.tsx` injeta
`workspaceId` opt-in nos dois fluxos de parse (linhas ~295 e ~388 no diff do PR); `AnalysisArchive.tsx`
tem filtro client-side por tipo fiscal (`typeFilter`, linhas 70/142-190) e reabertura via
`navigate('/upload', { state: { reopenLayout } })` (linhas 313-383). Os 3 gaps da minha
validação anterior ([[project_197_analysis_history_gate_2026_09_21]]) estão fechados.
Veredito: **PASS**.

**#201** — branch de trabalho atual (`feat/analysis-archive-filters-reopen`) já contém o código
do `FiscalPackageWizard.tsx` com os 3 gaps do PR de contrato mesclado anteriormente. Critérios
do issue #201: identificação doc/versão/operação/jurisdição = presente; upload por artefato com
progresso/erro/reenvio = presente (`progress`, `revisionError`, campo de revisão); confirmar
aba/cabeçalho/coluna antes de interpretar planilha = já feito (PR #269, marcado `[x]` no
issue); nova revisão em vez de mutação silenciosa de Draft = presente (`revisionOpen`,
POST `/revisions`); "não habilita geração sem origem/estrutura/XSD" = `canSubmit`/`missingRequired`
bloqueiam envio. Critério pendente e **explicitamente documentado na própria UI** (aside
"O que esta tela não mostra ainda", linha ~692-700 de `FiscalPackageWizard.tsx`): qualidade,
conflito e ausência semântica do artefato — API só devolve hash/tamanho/status de antivírus,
não há contrato de qualidade/conflito ainda (gap é da API, não do front). `localStorage`: grep
não encontrou uso de `localStorage`/`sessionStorage` para conteúdo fiscal. Gates rodados
localmente nos arquivos do fluxo: lint limpo, `tsc --noEmit` limpo, 9/9 testes do componente
passando, `contract:check` 47/47 (5 propostos). Veredito: **PASS parcial** — a issue tem 1
critério não totalmente atendido (revisão de pacote com qualidade/conflito/ausência), mas é
bloqueio de contrato da API, já sinalizado na UI e no PR anterior; não é responsabilidade do
front resolver sozinho. Não é um FAIL de código, é uma dependência externa registrada.

**Why:** branch local (`feat/analysis-archive-filters-reopen`) não tinha os commits de #289/#291
localmente até o `git fetch`; sempre conferir `origin/develop` em vez de assumir que a branch
local está atualizada.

**How to apply:** ao revalidar PRs já mergeados, checar `gh pr view --json mergeStateStatus`
primeiro, depois `git fetch` e comparar `git log origin/develop` antes de concluir "não
implementado" só por não achar grep na branch local.
