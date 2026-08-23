---
name: transformation-candidate-id-gap
description: TransformationCandidate não expõe nome amigável do mapper nem layoutOutputTarget — só candidateId; abas de candidatos do mesmo pathway usam recorte do candidateId como diferenciador
metadata:
  type: project
---

`src/types/transformation.ts` (`TransformationCandidate`, linhas 56-64) só tem `candidateId`,
`pathway`, `transformedXml`, `score`, `segmentMappings`, `validation`, `failureReason`. Não há
campo de nome do Mapeador Sysmiddle nem `layoutOutputTarget`.

Quando há múltiplos candidatos `sysmiddle` para o mesmo documento
(`XmlTransformationDisplay.tsx`, seletor `.xml-transformation-candidate-btn`), os botões
mostravam só "Sysmiddle" para todos, sem diferenciação (2026-08-23).

**Fix aplicado**: `buildCandidateDifferentiator()` em `XmlTransformationDisplay.tsx` extrai um
recorte curto do próprio `candidateId` (que por convenção do back-end é
`"sysmiddle-{MapperGuid}"`) e mostra como sufixo do label, ex. "Sysmiddle — a1b2c3d4…". Não é
um nome legível — é só o suficiente pra distinguir abas.

**Bloqueio real**: nome amigável do mapper e `layoutOutputTarget` **não existem no contrato
hoje**. Para resolver de verdade, `execute-candidates` (API) precisaria devolver esses campos
em `TransformationCandidate`. Isso é pedido para a equipe da API / `@lp-contract-qa`, não algo
que dá pra inventar no front.
