---
name: mqseries-e2e-504-recurrence-watch
description: Teste e2e-real/mqseries-user-flow.spec.ts:148 já falhou 2x por 504 em poucas horas (rerun resolveu ambas) — vigiar 3ª ocorrência
metadata:
  type: project
---

O teste `e2e-real/mqseries-user-flow.spec.ts:148` ("usuário processa e edita o MQSeries real
com correlação ponta a ponta"), rodado no job "Desenvolvimento HTTPS (React + BFF)" do workflow
"CI e Deploy Dev", falhou duas vezes em pouco tempo no mesmo dia com o mesmo sintoma: resposta
504 em vez de 200 na transformação multi-candidato, quebrando a checagem de correlation ID
ponta a ponta (browser → BFF → API → browser).

- 1ª ocorrência: PR #284, run 35605337413 (2026-09-21 ~13:23 UTC). Rerun (`gh run rerun --failed`)
  passou limpo — tratado como flake pontual do ambiente real do MQSeries/API.
- 2ª ocorrência: PR #287 (`develop → main`), run 35624801290 (2026-09-21 ~16:18 UTC). Mesmo
  sintoma exato (504 no mesmo teste). Rerun solicitado.

**Why:** duas falhas idênticas no mesmo teste em ~3h no mesmo dia podem ainda ser coincidência
de latência real do MQSeries/API (ambiente real, não mockado), mas também podem ser o início de
um padrão de degradação (horário de pico do runner/ambiente, timeout justo demais). Não há
evidência suficiente ainda para mexer em timeout/config — mudança de infra exige 3+ ocorrências
ou sinal claro e independente de degradação.

**How to apply:** se este teste específico (`mqseries-user-flow.spec.ts:148`, sintoma 504 na
transformação multi-candidato) falhar uma 3ª vez, **não trate como flake automaticamente** —
pare e investigue timeout/capacidade do ambiente real (MQSeries e/ou API) antes de simplesmente
re-rodar. Considerar: aumentar timeout do teste, revisar carga do ambiente real no horário das
falhas, ou acionar a equipe da API sobre latência do endpoint de transformação multi-candidato.
