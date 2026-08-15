---
name: stale-head-merge-drops-commits
description: Mergear PR cujo head já avançou faz o GitHub usar o head antigo e descartar silenciosamente os commits posteriores — verifique por conteúdo, não por nome de branch, se o fix entrou na develop
metadata:
  type: project
---

Quando uma PR é mergeada, o GitHub usa o head que estava registrado no momento do merge. Commits
empurrados para a branch **depois** disso não entram — e nada sinaliza a perda: a branch aparece
como mergeada, a PR fica fechada e o commit continua existindo no `git log` da branch de origem.

**Why:** aconteceu em 2026-08-13 com a PR #108 (`codex/feat-sap-idoc-hierarchy`), mergeada em
`1b78270` sobre o head desatualizado `a517863`. Dois commits posteriores ficaram órfãos:
`41a84f0` (permissão CodeQL) e `0084b4b` (cleanup de timer no `StructureTree`). Ambos exigiram
PR de recuperação por cherry-pick sobre a `develop` atual — #110 e #113. O modo de falha é
traiçoeiro porque a branch de origem _contém_ o commit; só a `develop` não contém.

**How to apply:** depois de mergear qualquer PR — e sempre que alguém disser "esse fix já está na
develop" — confirme **pelo conteúdo do arquivo na `develop`**, não pela existência do commit na
branch de origem nem pelo estado da PR:

```
git show origin/develop:<caminho> | grep -c <símbolo-do-fix>
```

Se der 0, o commit se perdeu: cherry-pick sobre `origin/develop` numa branch `fix/*` nova e abra
PR própria explicando a origem. Vale o mesmo cuidado ao mergear: se a PR ficou aberta por um
tempo e a branch recebeu push no meio, revalide o head antes de clicar em merge. Ver
[[feedback_verificar_diagnostico_independente]].
