---
name: project_document_analysis_tab_handoff
description: Aba de análise (multi-candidato de transformação + diagnóstico de erro via IA/Ollama) — histórico do handoff e estado atual, Gaps 1 e 2 já integrados.
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

**Atualização 2026-07-29 — Gaps 1 e 2 integrados (não mais pendentes):** @lp-architect (Aria)
confirmou os dois contratos (implementados por @lp-backend-dev/Dex e @lp-parser-llm/Lia).
Tipos fechados em `transformation.ts` (sem mais TODO), services
`transformationService.executeTransformationCandidates` (POST
`/api/transformationexecution/execute-candidates`) e novo
`xmlAnalysisService.diagnoseValidationError` (POST
`/api/xml-analysis/diagnose-validation-error`), store estendido e UI ligada em
`XmlTransformationDisplay.tsx` (seletor de candidato, estado vazio, painel de diagnóstico).
Commits `6311444` (feature) e `699788f` (memória) em `feat/document-analysis-tab`, não
pushado.

Pontos de atenção que continuam válidos para qualquer trabalho futuro nesses dois fluxos:
- `candidateId` **"tclxsl-1" é fixo** para o pathway TCL/XSL — não é gerado dinamicamente.
- `score` do candidato existe no contrato mas **ainda não é usado para ordenação** na UI.
- `validation` só vem preenchido no candidato `tcl-xsl` — os demais não trazem esse campo.
- **Zero candidatos é caso de sucesso**, não erro: API responde 200 com array vazio +
  `warnings`; UI trata como estado vazio, não como falha.
- Diagnóstico via Ollama pode levar **dezenas de segundos a minutos** em ambiente sem GPU
  (~150s observado) — por isso tem loading state dedicado na UI, propositalmente diferente de
  um spinner genérico de 2-3s. Não simplificar esse loading sem confirmar que já há GPU em
  produção.
- `analyze-xsd-error-with-ai` **não existe mais referenciado no repo** (confirmado via grep) —
  não há nada a migrar desse endpoint antigo.

**Pendente:** o fluxo real não foi exercitado end-to-end contra Ollama/API real nesta sessão —
só validação estática/build. Quando alguém testar contra ambiente real, validar principalmente
o timeout longo do diagnóstico (ver ponto acima).
