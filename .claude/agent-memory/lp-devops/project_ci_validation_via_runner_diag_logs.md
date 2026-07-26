---
name: ci-validation-via-runner-diag-logs
description: como confirmar se um push disparou ci-dev.yml e se passou, sem gh CLI, lendo os logs do próprio runner self-hosted local (que roda nesta máquina)
metadata:
  type: project
---

O runner self-hosted de dev (`NDD-NOT-10910`, label `dev-local`) **roda nesta mesma máquina**
como serviço Windows: `actions.runner.LayoutParser.NDD-NOT-10910` (checar com
`powershell.exe -Command "Get-Service -Name 'actions.runner.LayoutParser.NDD-NOT-10910'"`).
Isso dá acesso direto aos logs do runner em disco, sem precisar de `gh`/API — ver
[[project_gh_cli_unavailable_wsl]] para por que `gh` não é opção aqui.

**Onde olhar** (via WSL em `/mnt/c/actions-runner/_diag/`):
- `Runner_<timestamp>-utc.log` — log **único e contínuo** do processo runner (não roda por
  job); registra cada `JobDispatcher] finish job request for job <id> with result: Succeeded`
  ou `...Failed`. É a fonte mais rápida para saber "o último job passou ou falhou".
- `Worker_<timestamp>-utc.log` — um arquivo **por job**, nomeado com o timestamp de início
  (bate com o `finish job request` correspondente no Runner log). É JSON estruturado (mensagem
  do protocolo do Actions), **não** é um transcript limpo tipo `.claude/tmp/build/*.txt` —
  não dá pra simplesmente grep no texto do `npm run build` ali. Mas dá pra confirmar:
  - identidade do job: `grep '"ref":\|<sha>'` → confirma branch (`refs/heads/develop`) e
    commit exatos que rodaram.
  - resultado: `grep '"result":'` → deve ser `"succeeded"` em todas as ocorrências.
  - sinal indireto de erro do `tsc`: `grep -c "error TS"` → 0 = provavelmente limpo (o texto
    de erro do `tsc` aparece cru na mensagem mesmo dentro do JSON quando existe).
- `_diag/pages/` e `_diag/blocks/` — buffer do live-log; **normalmente vazio** logo após o job
  terminar (é limpo assim que o upload pro GitHub confirma) — não confiar neles para
  transcript.

**Padrão benigno a não confundir com falha:** logo após um job terminar, é comum aparecer no
Runner log uma rajada de `TaskCanceledException`/`SocketException` do `BrokerServer` seguida de
`Back off N seconds before next retry` — é o long-poll de "próximo job" sendo cancelado pela
troca de estado Busy→Online, não indica runner quebrado. Confirmar saúde real via
`Get-Service` (`Status: Running`) em vez de reagir a esse stack trace.

**Como usar na prática:** antes de agir (push), anote a última linha do `Runner_*.log`
(`wc -l`) como baseline; depois do push, faça polling (`until grep -q "finish job request" ...;
do sleep 5; done` dentro de um único `timeout N bash -c '...'`, não várias chamadas com sleep
curto) até aparecer a linha nova; aí leia o `Worker_<mesmo timestamp>.log` para confirmar
branch/commit/resultado.

Ver [[project_ci_dev_dual_pipeline]] para o que cada resultado implica em termos de risco.
