---
name: project-ai-metrics-panel-gap3
description: Painel de métricas de IA (Gap 3) implementado em feat/document-analysis-tab contra contrato antecipado, back-end ainda não subiu os endpoints.
metadata:
  type: project
---

Contrato de `/api/ai-metrics/generations` (paginado, filtros de layout/modelo/sucesso/período)
e `/api/ai-metrics/summary` (agregado + breakdown por docType) publicado por @lp-architect
(Aria) em 2026-07-30. Implementado em `feat/document-analysis-tab` (commit `8e22185`) ANTES do
back-end existir — trabalho em paralelo intencional pedido pelo usuário.

**Why:** desacoplar front/back permite validar UI e camada de tipos sem bloquear no
cronograma do back-end; os dois lados convergem quando o contrato publicado virar real.

**How to apply:** ao voltar a este gap, os 404/erro de conexão que a `AiMetricsPanel`
mostra (`ai-metrics-warning`) são o estado ESPERADO até o back-end subir — não é bug do
front. Arquivos: `src/types/aiMetrics.ts`, `src/services/api/aiMetricsService.ts`,
`src/store/useAiMetricsStore.ts`, `src/components/aiMetrics/AiMetricsPanel.tsx` (+`.css`),
nova aba "Métricas IA" em `src/components/admin/AdminPage.tsx`.

Decisões de UI: badges de `xsdValido`/`cypressValidado`/`cStatPollux` são de 3 estados
(pendente=cinza quando `null`, nunca vermelho por padrão; OK verde quando `true`; falhou
vermelho só quando `false` explícito) — ver `ValidationBadge` no componente. `sucesso` é
campo separado e não deve ser confundido com qualidade de validação.

Pendente quando o back-end publicar de verdade:
- Confirmar shape real da resposta bate 1:1 com `src/types/aiMetrics.ts` (especialmente
  `docType` já vindo derivado, sem exigir parsing de `layout` no front).
- Validar paginação/filtros contra dados reais (paginação é client-driven via `page`/`pageSize`
  na store, nunca testada contra API real ainda).
- Se a URL/porta real divergir do padrão de `getApiBaseUrl()` em `src/services/api.ts`, ajustar
  lá (não há nada Gap-3-específico hardcoded).
