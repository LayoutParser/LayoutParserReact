---
name: project-field-correction-curation-drift-2026-09-10
description: Story #244 (fila de curadoria de correção de campo) — drift de schema entre src/types/fieldCorrectionCuration.ts e o DTO real da API (issue #346), corrigido e revalidado em 2026-09-10 (PASS)
metadata:
  type: project
---

**Atualização 2026-09-10 (revalidação): PASS.** `@lp-front-dev` corrigiu `src/types/fieldCorrectionCuration.ts`,
`src/services/api/fieldCorrectionCurationService.ts`, `src/store/useFieldCorrectionCurationStore.ts` e o
componente consumidor. Todos os campos, o envelope de `GET /pending`, a resposta mínima de
`POST /review` (`{ reportId, status }`) e o merge parcial no store conferem com
`FieldCorrection.cs:39-51` e `TransformationExecutionController.cs:564-650`. Liberado para `@lp-qa`/`@lp-doc`.

`GET /api/transformation/field-correction/pending` e `POST /api/transformation/field-correction/{reportId}/review`
existem na API (LayoutParserApi `Controllers/TransformationExecutionController.cs`, linhas ~487-660,
DTOs em `Models/Fiscal/FieldCorrection.cs`, issue #345/#346), mas o schema do item da fila foi
**inferido** incorretamente pelo front em `src/types/fieldCorrectionCuration.ts`.

Divergências (nome do campo front vs real `FieldCorrectionReportSummary`):
- `nodePath` → real é `fieldPath`
- `originalValue` → real é `observedValue`
- `correctedValue` → real é `expectedValue`
- `comment` → real é `justification`
- `reportedBy` (string livre) → real é `reportedByUserId` (Guid, não nome legível)
- `reportedAt` → real é `createdAtUtc`
- front não tem `candidateId`, `reviewedByUserId`, `reviewedAtUtc` (existem na API)
- envelope de `GET /pending`: real é `{ success, count, reports }`; front só tipa `{ reports }`
  (inofensivo, mas incompleto)
- resposta de `POST /review`: real é só `{ reportId, status }` (objeto minimo); front tipou como
  `FieldCorrectionReport` completo — e `useFieldCorrectionCurationStore.decide` **substitui a linha
  inteira** por esse retorno, apagando os demais campos do item revisado na UI.

**Why:** nomes de campo errados fazem `FieldCorrectionCuration.tsx` renderizar `undefined` para
path/valor original/valor corrigido/comentário/autor em todo item da fila (bug funcional, não só
de tipos) assim que a API real responder.

**How to apply:** ao reauditar #244/#346, comparar contra `Models/Fiscal/FieldCorrection.cs` e o
controller (fonte local, MCP indisponível nesta verificação) — não confiar no comentário de
"contrato confirmado" no topo de `fieldCorrectionCuration.ts` sem reconferir o DTO. Corrigir é
tarefa de `@lp-front-dev`: renomear campos, tipar `review()` como `{ reportId, status }` e fazer
merge parcial no store em vez de substituir o item inteiro.
