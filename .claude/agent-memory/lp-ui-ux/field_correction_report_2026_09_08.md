---
name: field-correction-report-2026-09-08
description: Decisão de UX para issue #232 (report de divergência de campo na transformação XML) — formulário estruturado, não chat.
metadata:
  type: project
---

Issue #232 pedia desenho de um mecanismo pro usuário reportar campo divergente na comparação
Sysmiddle vs TCL/XSL (tela `XmlTransformationDisplay`). Decisão: **formulário estruturado por
campo** (não chat livre), acionado por botão inline no nó do `XmlTree` quando há
`activeCandidate` carregado.

**Por quê:** usuário real é alguém revisando parse fiscal sob pressão de prazo, já olhando o
campo errado — retrair a informação num chat é retrabalho. Além disso o sinal alimenta um loop
de correção automatizado do lado da API (`RepairOrchestrator`, ver ADR
`adr-geracao-automatica-convergencia-tcl-xslt-2026-09-08.md` da LayoutParserApi) que precisa de
dado estruturado, não texto livre a ser parseado depois.

**Dados já disponíveis no cliente sem novo contrato de leitura:** `xpath` de cada nó (vem de
`utils/xmlTree.ts` ao parsear `activeCandidate.transformedXml`), `candidateId`/`pathway`/
`correlationId` (`useTransformationStore`), `layoutGuid` (`parsedDocumentProvenance`). Não existe
`documentId` estável como conceito no front hoje — se a API precisar de um, é parte do pedido de
contrato cruzado.

**Payload proposto** (ainda não é contrato, só desenho pra abrir pedido cruzado à API):
`documentType, layoutGuid, correlationId, candidateId, pathway, fieldPath, observedValue,
expectedValue, justification, reportedAt`.

**Cuidado de UX registrado para quando isso virar componente real:** o indicador visual de
"campo reportado/pendente" precisa ser uma cor/ícone DISTINTO do vermelho já usado para "linha
inválida" — não pode colidir semanticamente com esse padrão existente (ver
[[design_system_conventions]] / [[modernization_2026_08_10]]).

Comentário completo com o desenho: https://github.com/LayoutParser/LayoutParserReact/issues/232#issuecomment-5578811320
