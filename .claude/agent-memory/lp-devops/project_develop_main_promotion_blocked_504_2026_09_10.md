---
name: develop-main-promotion-blocked-504
description: Promoção develop→main pausada — gate E2E real do MQSeries falha com 504 em execute-candidates no SHA 5ba3c1e
metadata:
  type: project
---

Promoção de `develop` para `main` está **pausada** no SHA `5ba3c1e0925c6dbef39f2481c4f16e7217e77861`
(inclui #227, #241 já em `main` via PR #243; #234 e #244 ainda pendentes de promoção).

O workflow obrigatório **CI e Deploy Dev** falha de forma consistente (2 execuções idênticas,
incluindo um rerun manual) no job `Desenvolvimento HTTPS (React + BFF)` → step
**Gate E2E real do MQSeries**:

- Teste: `e2e-real/mqseries-user-flow.spec.ts:148` (transformação multi-candidato)
- Chamada: `/api/transformationexecution/execute-candidates` na API real
- Sintoma: `status: 504` (gateway timeout) em vez de `200`
- Push anterior (`d7b73a6`, #241) passou normalmente no mesmo gate — a falha começou a partir
  do SHA atual, mas o padrão idêntico em 2 execuções sugere timeout real da API (provável IA/
  Ollama), não flake nem regressão determinística deste front.

**Why:** usuário decidiu (2026-09-10) reportar o 504 ao time da `LayoutParserApi` e aguardar
confirmação de correção, em vez de reexecutar o gate repetidamente ou forçar a promoção com
check obrigatório vermelho.

**How to apply:** NÃO abrir PR `develop → main` nem tentar merge enquanto este gate estiver
vermelho. Ao retomar: primeiro rodar `gh run rerun <run-id> --failed` (ou novo push) para
confirmar que a API já responde 200 em `execute-candidates`; só então seguir o fluxo normal de
promoção (`gh pr create` com base `main`, aguardar checks, pedir confirmação explícita do
usuário antes do merge — nunca mergear sozinho). Ver [[project_stale_head_merge_drops_commits]]
para cuidado adicional ao conferir o head na hora de retomar.
