---
name: ci-dev-dual-pipeline
description: ci-dev.yml (dev/feat, runner dev-local, tsc estrito) é isolado de deploy.yml (main, runner production, build:prod sem tsc) — implicação direta para triagem de falha de CI
metadata:
  type: project
---

Desde o commit `7d24128` ("ci: isola deploy de produção por label e adiciona CI de dev")
existem **dois pipelines totalmente isolados**:

- **`ci-dev.yml`** — dispara em push para `develop`/`feat/**`, roda no runner self-hosted com
  label `dev-local` (ex.: `NDD-NOT-10910`), executa `npm ci` + `npm run build` (= `tsc && vite
  build`). **Não faz deploy.**
- **`deploy.yml`** — dispara só em push para `main`/`master`, roda no runner com label
  `production` (servidor `172.25.32.42` / `WINSRV2022-LIB`), executa `npm install` + `npm run
  build:prod` (= `vite build --mode production`, **sem `tsc`**) e depois `robocopy` para o IIS.

**Why:** `ci-dev.yml` é o **primeiro gate que já rodou `tsc` estrito**
(`noUnusedLocals`/`noUnusedParameters`, ver [`frontend-standards.md`](../../rules/frontend-standards.md))
contra o código real deste repo — antes dele ninguém validava isso em CI. Isso significa que
dívida técnica de type-check pré-existente (imports/vars não usados, parâmetros implícitos
`any`) pode aparecer **pela primeira vez** em `ci-dev.yml` sem ter nenhuma relação com o que
motivou aquele push especificamente. Além disso, como `build:prod` **não roda `tsc`**, esse
tipo de erro **nunca** bloquearia produção — só o CI de dev.

**How to apply:** ao investigar uma falha em `ci-dev.yml` (step "Build (tsc + vite)"):
1. Comparar a lista de arquivos com erro contra `git diff main -- <arquivos>` (ou contra o
   merge-base da branch) antes de assumir que a feature/push em questão causou o problema —
   pode ser dívida pré-existente idêntica à `main`.
2. Lembrar sempre: falha em `ci-dev.yml` (que usa `tsc`) **não implica** risco de produção
   (`deploy.yml` usa `build:prod`, sem `tsc`) — são gates com propósitos diferentes por
   design, não uma falha de cobertura.
3. Runners nunca se cruzam (labels `dev-local` vs `production` são mutuamente exclusivas nos
   `runs-on`) — não é possível dívida de dev vazar para o runner de prod por engano de label.

Ver também [[feedback_verificar_diagnostico_independente]].
