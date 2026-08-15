---
name: quality-gates-flaky-unhandled-errors
description: Quality Gates pode ficar vermelho com 100% dos testes verdes — timer/async que escapa do teardown do jsdom vira "Unhandled Errors" e derruba o exit code do Vitest; o mesmo SHA já passou e falhou em runs diferentes
metadata:
  type: project
---

`Quality Gates` vermelho **não implica teste vermelho**. O Vitest sai com código de falha quando
há erro fora do ciclo de vida de qualquer teste: um `setTimeout`/promessa que sobrevive ao unmount
dispara depois do teardown do jsdom daquele arquivo e o callback avalia `document` sem `document`
no escopo → `ReferenceError: document is not defined` na seção **"Unhandled Errors"**, com o
sumário mostrando todos os testes passando.

O sintoma é **corrida, não determinismo**. Evidência: o SHA `a517863` teve dois runs de
`Quality Gates` com conclusões opostas — `31746745283` (evento `push`) **falhou** no step
"Executar quality gates" e `31746748036` (evento `pull_request`, mesmo SHA) **passou**. Rodando
o código pré-fix localmente, nem o arquivo isolado nem a suíte completa reproduziram a falha
(exit 0 nos dois casos).

**Why:** em 2026-08-15, ao preparar a PR #113, tentei reproduzir o erro para validar a descrição
do bug e não consegui. Sem essa checagem eu teria escrito no corpo da PR uma reprodução
determinística que não existe. O vazamento do timer é fato do código (visível no diff); o crash é
probabilístico.

**How to apply:**

- Diante de `Quality Gates` vermelho, antes de culpar o diff: procure "Unhandled Errors" e compare
  runs do **mesmo SHA** (`gh run list --json databaseId,name,headSha,conclusion,event`). Conclusões
  divergentes no mesmo SHA = corrida, não regressão.
- Não conclua "não é bug" só porque não reproduziu localmente. Timer que toca o DOM deve ser
  cancelado no unmount de qualquer forma — o fix se justifica pelo código, não pelo repro.
- Ao descrever o bug numa PR, separe o que é fato do código do que é sintoma observado. Ver
  [[feedback_verificar_diagnostico_independente]].
- **Capture o log enquanto está fresco.** `gh run view <id> --log-failed` devolveu vazio (exit 0,
  0 bytes, sem stderr) para o run de 2 dias atrás — a evidência textual da falha já não existia.
