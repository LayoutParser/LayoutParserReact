---
name: project-field-divergence-report-story234
description: Story #234 (reporte de divergência de campo pelo analista) implementada como estado local; achado importante sobre schema divergente do #244 (curadoria)
metadata:
  type: project
---

Story #234 ("Reportar divergência de campo por nó na árvore XML") implementada em
2026-09-10 como estado **puramente local** (Zustand): botão "Reportar divergência" nos nós
folha de `XmlTree` (`src/components/analysis/XmlTree.tsx`), habilitado só quando há
`activeCandidate` em `useTransformationStore`. Formulário estruturado em
`FieldDivergenceModal.tsx` (reaproveita `components/shared/Modal`), grava em
`useFieldCorrectionStore` (`src/store/useFieldCorrectionStore.ts`), tipo em
`src/types/fieldCorrection.ts` (`FieldCorrectionReport`). Chave de dedupe é
`candidateId::nodeId` (não `fieldPath`/xpath puro — xpath se repete entre irmãos; `nodeId`
já carrega a ocorrência).

**Achado importante (não estava no briefing original):** ao implementar, encontrei
`src/types/fieldCorrectionCuration.ts`, de uma Story #244 (curadoria) implementada no MESMO
dia (2026-09-10), que já tem um contrato de API **confirmado em produção**
(`LayoutParserApi#345`): `GET /api/transformation/field-correction/pending` e
`POST /api/transformation/field-correction/{reportId}/review`. Esse contrato define um
`FieldCorrectionReport` com campos BEM DIFERENTES dos meus: `reportId`, `documentId`,
`nodePath`, `originalValue`, `correctedValue`, `comment?`, `reportedBy?`, `reportedAt`,
`status: 'pending' | 'reviewed_accepted' | 'reviewed_rejected'`.

**Por quê isso importa:** quando a API finalmente expuser o endpoint de ESCRITA para o
analista criar o reporte (fechando o ciclo #234→#244), o payload de POST vai precisar bater
com esse schema de produção — não com o meu tipo local. Meu tipo (`nodeId`, `fieldPath`,
`candidateId`, `pathway`, `correlationId`, `observedValue`, `expectedValue`, `justification`)
foi modelado em torno do que a árvore XML tem disponível (candidato de transformação,
correlationId), não do contrato de persistência real — porque o briefing da #234 disse
explicitamente que a API não tinha endpoint de escrita ainda (e de fato não tem: só há GET
pending + POST review, nenhum POST de criação).

**Como aplicar:** ao abrir a story de integração real (POST de criação do reporte), mapear
meu `FieldCorrectionReport` local para o de `fieldCorrectionCuration.ts` — provavelmente
unificando os dois tipos ou fazendo um adapter no service novo. `@lp-contract-qa` deveria
validar isso antes de qualquer implementação (a doc do `fieldCorrectionCuration.ts` já avisa
que os nomes de campo "devem ser reconfirmados... assim que a tela for validada de ponta a
ponta").

Ver também [[project_field_correction_curation_story244_2026_09_10]] (memória sobre a #244).
