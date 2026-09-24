---
name: mapping-studio-tcl-deterministic-and-open-question-answers
description: Gaps a1/a2 do #199 resolvidos — TCL determinístico no Test Lab e resposta a perguntas abertas via novo endpoint PUT
metadata:
  type: project
---

Em 2026-09-21, dois gaps do #199 (Mapping Studio) foram fechados em
`feat/mapping-studio-tcl-and-answers` (commit `aa6b0bc`, branch criada a partir de
`origin/develop`, não mergeada):

- **a1 (TCL determinístico):** removido o aviso estático em `MappingTestLabPanel.tsx` que
  dizia que TCL não podia ser validado deterministicamente. O formulário de execução do
  Test Lab agora aceita `release.engine === 'tcl' || 'xslt'` (antes só `'xslt'`). Ainda
  NÃO existe `capabilities.tcl.deterministicTest` no contrato — não criar lógica
  condicional baseada nesse campo até a API confirmar (pedido em aberto).
- **a2 (resposta a `needs_input`):** contrato novo confirmado real, registrado em
  `contracts/api-endpoints.json` como `LayoutParserApi#422`:
  `PUT /api/workspaces/{workspaceId}/mapping-drafts/{draftId}/rules/{ruleId}/questions/{questionIndex}/answer`
  (body `{answer}`, string até 4000 chars, idempotente por texto igual, versão nova por
  texto diferente) + `GET .../mapping-drafts/{draftId}/question-answers` e
  `GET .../rules/{ruleId}/question-answers` (ambos com `?includeHistory=true`). Shape de
  `MappingDraftRuleQuestionAnswer` (`questionIndex`, `questionSnapshot`, `answer`,
  `answeredBy`, `answeredAt`, `version`) foi INFERIDO com type guard estrito — não
  confirmado via MCP; revisar com `@lp-contract-qa` quando possível.
  `MappingRuleReviewCard.tsx` ganhou `QuestionAnswerGroup` (histórico + form de resposta),
  novo `mappingDraftService.answerRuleQuestion/listDraftQuestionAnswers/listRuleQuestionAnswers`.
  Nota: `UpdateMappingDraftRuleInput.answer` (usado no PATCH de regra) é um campo
  DIFERENTE e mais antigo que nunca foi persistido pela API — não confundir os dois
  fluxos; o novo endpoint dedicado é o caminho real agora.

**Colisão de working tree evitada:** outro agente trabalhava em paralelo na branch
`feat/test-lab-suite-execution` (#204, `MappingTestLabPanel.tsx` com WIP não commitado).
Para não pisar nesse WIP, criei um `git worktree` separado a partir de `origin/develop`.
IMPORTANTE: `git worktree add` para um path sob `/tmp` NÃO funciona neste ambiente WSL —
`npm`/`npx`/`tsc` só existem como binários Windows (`/mnt/c/Program Files/nodejs/node.exe`,
sem `node` nativo no WSL), e os wrappers `.cmd` falham com "UNC paths are not supported"
quando o cwd não é um caminho `/mnt/c/...`. Sempre criar worktrees de front-end como
diretório irmão do repo em `/mnt/c/Users/.../source/repos/`, nunca em `/tmp`. Ver
[[feedback_windows_node_worktree_path_constraint]] (a criar se o padrão se repetir).
