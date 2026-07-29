---
name: project_document_analysis_tab_handoff
description: Handoff da @lp-architect (Aria) para a aba de análise (multi-candidato + diagnóstico IA) — o que já existia, o que foi feito, o que falta.
metadata:
  type: project
---

Em 2026-07-28, @lp-architect (Aria) pediu início da "aba de análise de documento" (TXT
posicional + XML transformado + seletor multi-candidato + diagnóstico de erro via IA/Ollama),
branch `feat/document-analysis-tab`, referência visual ndd-frontend (Raleway/Bootstrap/Kendo —
só estética, nunca stack).

**Descoberta importante:** boa parte do pedido já existia, entregue pela feature anterior
`feat/xml-transformation-toggle` (já mergeada — ver [[project_xml_transformation_feature]]):
`AnalysisModeTabs.tsx` já implementa as abas "TXT Posicional" / "XML Transformação Final",
rota `/analysis` já aponta pra `LayoutParserPage.tsx` que renderiza essas abas. Antes de
iniciar qualquer "aba de análise" do zero, checar se não é retrabalho — grep por
`AnalysisModeTabs`, `useTransformationStore`, `XmlTransformationDisplay` primeiro.

**O que foi adicionado neste handoff** (commit `9ec563a` em `feat/document-analysis-tab`,
não pushado):
- `src/services/api/logService.ts` + `src/types/clientLog.ts`: POST `/api/logs/client`
  (contrato NÃO confirmado com backend, é rascunho razoável), usado para substituir
  `console.error` no fluxo de transformação (`AnalysisModeTabs.tsx`,
  `XmlTransformationDisplay.tsx`). Decisão do usuário: front nunca deve logar solto no
  console para eventos relevantes a diagnóstico — só nesses dois arquivos por ora, **não**
  em todo o resto do código (há dezenas de `console.log`/`console.error` legados em
  `FieldDisplay.tsx`, `StructureTree.tsx`, `upload/*` — fora de escopo, migrar
  incrementalmente).
- `ParseResponse.transformationsStatus` (`completed`/`processing`/`not_applicable`/`error`)
  em `src/types/api.ts`, usado em `AnalysisModeTabs.tsx` pra refletir loading/erro
  assíncrono da transformação na label da aba.
- Tipos de rascunho `TransformationCandidate` e `ValidationDiagnostic` em
  `src/types/transformation.ts` + comentários TODO em `XmlTransformationDisplay.tsx`
  marcando onde plugar multi-candidato e diagnóstico IA — **não implementados**, sem
  fetch/wiring real.

**Bloqueio conhecido (repassar a quem continuar):** contrato exato de
`XmlAnalysisController`/`TransformationController` para multi-candidato e diagnóstico Ollama
ainda não confirmado com @lp-backend-dev (Dex). Não fixar tipos definitivos nem UI real até
confirmação — próximo passo é essa confirmação, depois vira feature separada.

**Atualização 2026-07-29 — resolvido:** @lp-architect (Aria) confirmou os dois contratos
(implementados por @lp-backend-dev/Dex e @lp-parser-llm/Lia). Tipos fechados em
`transformation.ts` (sem mais TODO), services `transformationService.executeTransformation-
Candidates` (POST `/api/transformation-execution/execute-candidates`) e novo
`xmlAnalysisService.diagnoseValidationError` (POST `/api/xml-analysis/diagnose-validation-
error`), store estendido e UI ligada em `XmlTransformationDisplay.tsx` (seletor de candidato,
estado vazio, painel de diagnóstico). Commit `6311444` em `feat/document-analysis-tab`, não
pushado. Ponto de atenção herdado do handoff: `diagnose-validation-error` só foi validado
isoladamente contra Ollama real (~150s de latência, CPU-only) — não end-to-end; loading da UI
foi feito propositalmente "não é spinner de 2-3s" por causa disso, não simplificar sem
confirmar que já há GPU em produção.
