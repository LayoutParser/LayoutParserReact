---
name: feedback-dependabot-peer-bump-gaps
description: dependabot pode bumpar um pacote sem o peer correspondente, quebrando npm ci; checar peers antes de assumir que o lockfile resolve sozinho
metadata:
  type: feedback
---

Dependabot agrupa bumps por "grupo" de dependências e já causou duas quebras de peerDependency
na mesma leva de PRs em 2026-09: `@vitest/coverage-v8` foi para `^5.0.0` (PR #221/#223) sem
subir `vitest` (ficou em `^4.1.10`, exige peer `vitest@5.0.0`); depois, ao corrigir isso e rodar
`npm install`, apareceu um segundo conflito preexistente — `@eslint/js` em `^10.0.1` sem `eslint`
correspondente (ficou em `^9.39.5`).

**Why:** merges de dependabot no `develop` (grupos `vitest/coverage-v8`, `eslint-toolchain`)
passaram no CI mesmo com o par quebrado porque o lockfile antigo ainda resolvia; o conflito só
aparece no próximo `npm ci`/`npm install` limpo (como no gate de promoção `develop → main`,
PR #224).

**How to apply:** ao investigar falha de `npm ci`/ERESOLVE em CI, não assuma que é um pacote só —
depois de alinhar o primeiro par (ex.: `vitest` + `@vitest/coverage-v8`), rode `npm install` de
novo, pois o resolver pode revelar outro par desalinhado em seguida. Prefira alinhar o par pelo
mesmo major (subir o mais atrasado) em vez de fixar para trás, exceto quando o bump maior
implicar mudança de config fora do escopo da correção pontual — nesse caso, reverta só o pacote
recém-bumpado ao major anterior (como fiz com `@eslint/js` voltando a `^9.39.5`) e documente que
o bump maior real (ESLint 10) fica para uma tarefa própria.
