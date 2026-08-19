---
name: ia-fallback-polling-contract-gap
description: RESOLVIDO — endpoint de status IA registrado no manifesto; gap de cobertura em XmlTransformationDisplay.test.tsx também fechado
metadata:
  type: project
---

Branch `feat/ia-fallback-polling` (issue #140) implementou polling do fallback automático de
IA em `execute-candidates`.

**Histórico:** commit `70d28e9` passou lint/typecheck/test:coverage/format/audit mas falhou
`contract:check` (endpoint `GET .../execute-candidates/:param/ia-status`, consumido via
`transformationService.getAiCandidateStatus`, não estava em `contracts/api-endpoints.json`).
Commit `042f3cc` ("fix(contract): registrar endpoint ia-status no manifesto") **resolveu** isso
— `npm run contract:check` agora reporta 12/12 endpoints registrados.

**Gap de cobertura fechado (2026-08-18):** `src/components/analysis/XmlTransformationDisplay.test.tsx`
não tinha nenhum teste cobrindo os 5 estados de `aiFallback.status` nem o banner de erro de
polling, apesar do componente já consumir `useAiFallbackPolling` e renderizar tudo isso.
Adicionado describe `'fallback automático de IA (aiFallback)'` com 8 casos: `running`,
`failed` sem `lastError`, `failed` com `diagnostics.lastError`, `not-applicable`, `not-found`,
`converged` com `hasGroundTruth: false` (badge de sugestão), `converged` com
`hasGroundTruth: true` (badge de validado) e o banner `aiFallback.error` (falha de polling,
independente do status). O hook é mockado via `vi.mock('../../hooks/useAiFallbackPolling')`
para controlar o estado diretamente, em vez de esperar o backoff real do polling.

**Why:** o gate de contrato existe para pegar exatamente esse tipo de caso — endpoint novo
consumido pelo front sem entrada no manifesto local; cobertura de teste existe para pegar
regressão nos 5 estados de UI que dependem só de props/mocks, não de um fluxo E2E completo.

**How to apply:** ao revisar PR que adiciona chamada nova a `services/api/*.ts`, rodar
`npm run contract:check` isoladamente. Ao revisar componente que consome um hook de polling
com estados terminais/erro, confirmar que o `.test.tsx` cobre cada branch de status, não só o
caminho feliz do fluxo principal (fácil de esquecer quando o teste original foi escrito antes
do hook existir).
